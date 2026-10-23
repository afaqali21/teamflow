"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { directChannelKey } from "@/lib/direct-channel";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

const targetSchema = z.object({
  userId: z.string().min(1),
});

const channelSchema = z.string().min(1);

async function findOrCreateDirectChannel(actorId: string, targetId: string): Promise<string | null> {
  const directKey = directChannelKey(actorId, targetId);
  if (!directKey) {
    return null;
  }

  const existing: { id: string } | null = await db.channel.findUnique({
    where: { directKey },
    select: { id: true },
  });
  if (existing) {
    return existing.id;
  }

  try {
    const created: { id: string } = await db.channel.create({
      data: {
        type: "DM",
        directKey,
        members: {
          create: [{ userId: actorId, lastReadAt: new Date() }, { userId: targetId }],
        },
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? error.code : null;
    if (code !== "P2002") {
      throw error;
    }
    const raced: { id: string } | null = await db.channel.findUnique({
      where: { directKey },
      select: { id: true },
    });
    return raced?.id ?? null;
  }
}

export async function startDirectMessage(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const parsed = targetSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) {
    return "Choose a person.";
  }

  const target: { id: string; isActive: boolean } | null = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, isActive: true },
  });
  if (
    !target ||
    !can(actor, "directMessage.start", {
      type: "directMessage",
      targetUserId: target.id,
      targetIsActive: target.isActive,
    })
  ) {
    return "You cannot message that person.";
  }

  const channelId = await findOrCreateDirectChannel(actor.id, target.id);
  if (!channelId) {
    return "You cannot message that person.";
  }

  revalidatePath("/chat");
  redirect(`/chat/${channelId}`);
}

export async function markChannelRead(channelId: string): Promise<{ error: string | null }> {
  const actor = await requireUser();
  const parsed = channelSchema.safeParse(channelId);
  if (!parsed.success) {
    return { error: "That conversation could not be updated." };
  }

  const membership: {
    lastReadAt: Date | null;
    channel: { projectId: string | null };
  } | null = await db.channelMember.findUnique({
    where: { channelId_userId: { channelId: parsed.data, userId: actor.id } },
    select: { lastReadAt: true, channel: { select: { projectId: true } } },
  });
  if (
    !membership ||
    !can(actor, "message.send", {
      type: "message",
      isMember: true,
      authorId: actor.id,
    })
  ) {
    return { error: "You do not have access to this conversation." };
  }

  const latest: { createdAt: Date } | null = await db.message.findFirst({
    where: { channelId: parsed.data, deletedAt: null, authorId: { not: actor.id } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: { createdAt: true },
  });
  if (!latest || (membership.lastReadAt && membership.lastReadAt >= latest.createdAt)) {
    return { error: null };
  }

  await db.channelMember.update({
    where: { channelId_userId: { channelId: parsed.data, userId: actor.id } },
    data: { lastReadAt: new Date() },
  });
  revalidatePath("/", "layout");
  revalidatePath("/chat");
  if (membership.channel.projectId) {
    revalidatePath(`/projects/${membership.channel.projectId}`);
  }
  return { error: null };
}
