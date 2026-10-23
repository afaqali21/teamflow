"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  canSendMessagePayload,
  MAX_MESSAGE_ATTACHMENTS,
  validateAttachmentIds,
} from "@/lib/attachments";
import type { ClientMessage } from "@/lib/chat-message";
import { db } from "@/lib/db";
import { mentionedUserIds, newlyMentioned } from "@/lib/mentions";
import { mapRow, messageListSelect, getMessages } from "@/lib/messages";
import { pusherChannelName } from "@/lib/message-page";
import { notifyUsers } from "@/lib/notifications";
import { can } from "@/lib/permissions";
import { presentMessage, presentMessages } from "@/lib/present-chat";
import { getPusher } from "@/lib/pusher";
import { requireUser } from "@/lib/session";

const sendSchema = z.object({
  channelId: z.string().min(1),
  body: z.string().trim().max(4000),
  fileIds: z.array(z.string().min(1)).max(MAX_MESSAGE_ATTACHMENTS).default([]),
});

const editSchema = z.object({
  messageId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

const messageIdSchema = z.object({
  messageId: z.string().min(1),
});

const olderSchema = z.object({
  channelId: z.string().min(1),
  cursor: z.string().min(1),
});

type MessageResult = {
  error: string | null;
  message: ClientMessage | null;
};

async function publish(channelId: string, event: string, payload: unknown) {
  const pusher = getPusher();
  if (!pusher) {
    return;
  }
  try {
    await pusher.trigger(pusherChannelName(channelId), event, payload);
  } catch (error) {
    console.error("Pusher message event failed.", error);
  }
}

async function notifyMentions(
  channel: { id: string; projectId: string | null },
  actor: { id: string; name: string | null; email: string },
  previousBody: string | null,
  body: string,
) {
  if (!body.includes("@")) {
    return;
  }
  const members: { user: { id: string; name: string | null; email: string } }[] =
    await db.channelMember.findMany({
      where: { channelId: channel.id, user: { isActive: true } },
      select: { user: { select: { id: true, name: true, email: true } } },
    });
  const people = members.map((member) => member.user);
  const ids =
    previousBody === null ? mentionedUserIds(body, people) : newlyMentioned(previousBody, body, people);
  if (ids.length === 0) {
    return;
  }
  const snippet = body.length > 140 ? `${body.slice(0, 137)}...` : body;
  const who = actor.name?.trim() || actor.email;
  await notifyUsers({
    userIds: ids,
    actorId: actor.id,
    type: "MENTION",
    title: "You were mentioned",
    body: `${who}: ${snippet}`,
    link: channel.projectId ? `/projects/${channel.projectId}?tab=chat` : `/chat/${channel.id}`,
  });
}

function refresh(projectId: string | null) {
  revalidatePath("/", "layout");
  revalidatePath("/chat");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
}

async function loadPresentedMessage(messageId: string) {
  const row = await db.message.findUnique({
    where: { id: messageId },
    select: messageListSelect,
  });
  if (!row) {
    return null;
  }
  return presentMessage(mapRow(row));
}

export async function sendMessage(
  channelId: string,
  body: string,
  fileIds: string[] = [],
): Promise<MessageResult> {
  const actor = await requireUser();
  const parsed = sendSchema.safeParse({ channelId, body, fileIds });
  if (!parsed.success) {
    return { error: "Enter a message up to 4000 characters.", message: null };
  }
  if (!canSendMessagePayload(parsed.data.body, parsed.data.fileIds)) {
    return { error: "Enter a message or attach a file.", message: null };
  }
  const attachmentError = validateAttachmentIds(parsed.data.fileIds);
  if (attachmentError) {
    return { error: attachmentError, message: null };
  }

  const channel: { id: string; projectId: string | null } | null = await db.channel.findUnique({
    where: { id: parsed.data.channelId },
    select: { id: true, projectId: true },
  });
  const membership = channel
    ? await db.channelMember.findUnique({
        where: { channelId_userId: { channelId: channel.id, userId: actor.id } },
        select: { userId: true },
      })
    : null;
  if (
    !channel ||
    !can(actor, "message.send", {
      type: "message",
      isMember: Boolean(membership),
      authorId: actor.id,
    })
  ) {
    return { error: "You do not have permission to send messages.", message: null };
  }

  if (parsed.data.fileIds.length > 0) {
    if (!channel.projectId) {
      return { error: "Attachments are only available in project chat.", message: null };
    }
    const files: { id: string; projectId: string; status: string }[] = await db.file.findMany({
      where: { id: { in: parsed.data.fileIds } },
      select: { id: true, projectId: true, status: true },
    });
    if (files.length !== parsed.data.fileIds.length) {
      return { error: "One or more attachments could not be found.", message: null };
    }
    if (files.some((file) => file.status !== "READY" || file.projectId !== channel.projectId)) {
      return { error: "Attach only ready files from this project.", message: null };
    }
  }

  const created = await db.message.create({
    data: {
      channelId: channel.id,
      authorId: actor.id,
      body: parsed.data.body,
      attachments:
        parsed.data.fileIds.length > 0
          ? {
              create: parsed.data.fileIds.map((fileId) => ({ fileId })),
            }
          : undefined,
    },
    select: { id: true },
  });

  const message = await loadPresentedMessage(created.id);
  if (!message) {
    return { error: "The message could not be sent.", message: null };
  }
  await publish(channel.id, "message", message);
  if (parsed.data.body) {
    await notifyMentions(channel, actor, null, parsed.data.body);
  }
  refresh(channel.projectId);
  return { error: null, message };
}

export async function editMessage(messageId: string, body: string): Promise<MessageResult> {
  const actor = await requireUser();
  const parsed = editSchema.safeParse({ messageId, body });
  if (!parsed.success) {
    return { error: "Enter a message up to 4000 characters.", message: null };
  }

  const existing = await db.message.findUnique({
    where: { id: parsed.data.messageId },
    select: {
      id: true,
      body: true,
      authorId: true,
      deletedAt: true,
      channel: { select: { id: true, projectId: true } },
    },
  });
  const membership = existing
    ? await db.channelMember.findUnique({
        where: { channelId_userId: { channelId: existing.channel.id, userId: actor.id } },
        select: { userId: true },
      })
    : null;
  if (
    !existing ||
    existing.deletedAt ||
    !can(actor, "message.editOwn", {
      type: "message",
      isMember: Boolean(membership),
      authorId: existing.authorId,
    })
  ) {
    return { error: "You can only edit your own messages.", message: null };
  }

  await db.message.update({
    where: { id: existing.id },
    data: { body: parsed.data.body },
  });
  const message = await loadPresentedMessage(existing.id);
  if (!message) {
    return { error: "The message could not be edited.", message: null };
  }
  await publish(existing.channel.id, "message-updated", message);
  await notifyMentions(existing.channel, actor, existing.body, parsed.data.body);
  refresh(existing.channel.projectId);
  return { error: null, message };
}

export async function deleteMessage(messageId: string): Promise<MessageResult> {
  const actor = await requireUser();
  const parsed = messageIdSchema.safeParse({ messageId });
  if (!parsed.success) {
    return { error: "That message could not be deleted.", message: null };
  }

  const existing = await db.message.findUnique({
    where: { id: parsed.data.messageId },
    select: {
      id: true,
      authorId: true,
      deletedAt: true,
      channel: { select: { id: true, projectId: true } },
    },
  });
  const membership = existing
    ? await db.channelMember.findUnique({
        where: { channelId_userId: { channelId: existing.channel.id, userId: actor.id } },
        select: { userId: true },
      })
    : null;
  if (
    !existing ||
    existing.deletedAt ||
    !can(actor, "message.deleteOwn", {
      type: "message",
      isMember: Boolean(membership),
      authorId: existing.authorId,
    })
  ) {
    return { error: "You can only delete your own messages.", message: null };
  }

  await db.message.update({
    where: { id: existing.id },
    data: { deletedAt: new Date() },
  });
  await publish(existing.channel.id, "message-deleted", { id: existing.id });
  refresh(existing.channel.projectId);
  return { error: null, message: null };
}

export async function loadOlderMessages(channelId: string, cursor: string) {
  const parsed = olderSchema.safeParse({ channelId, cursor });
  if (!parsed.success) {
    return { error: "Older messages could not be loaded.", messages: [], nextCursor: null };
  }

  const page = await getMessages(parsed.data.channelId, parsed.data.cursor);
  if (!page) {
    return { error: "You do not have access to this channel.", messages: [], nextCursor: null };
  }

  return {
    error: null,
    messages: await presentMessages(page.messages),
    nextCursor: page.nextCursor,
  };
}
