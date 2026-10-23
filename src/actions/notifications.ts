"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

const idSchema = z.object({
  notificationId: z.string().min(1),
});

export async function markNotificationRead(notificationId: string): Promise<{ error: string | null }> {
  const actor = await requireUser();
  const parsed = idSchema.safeParse({ notificationId });
  if (!parsed.success) {
    return { error: "That notification could not be updated." };
  }

  const row: { id: string; userId: string; readAt: Date | null } | null = await db.notification.findUnique({
    where: { id: parsed.data.notificationId },
    select: { id: true, userId: true, readAt: true },
  });
  if (!row || !can(actor, "notification.read", { type: "notification", ownerId: row.userId })) {
    return { error: "You cannot update that notification." };
  }

  if (!row.readAt) {
    await db.notification.update({
      where: { id: row.id },
      data: { readAt: new Date() },
    });
    revalidatePath("/", "layout");
  }
  return { error: null };
}

export async function markAllNotificationsRead(): Promise<{ error: string | null }> {
  const actor = await requireUser();
  if (!can(actor, "notification.read", { type: "notification", ownerId: actor.id })) {
    return { error: "You cannot update those notifications." };
  }

  await db.notification.updateMany({
    where: { userId: actor.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/", "layout");
  return { error: null };
}
