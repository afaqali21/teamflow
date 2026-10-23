import { db } from "@/lib/db";
import { sliceNewestPage, MESSAGE_PAGE_SIZE } from "@/lib/message-page";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export type ChatAttachment = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
};

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: Date;
  author: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  attachments: ChatAttachment[];
};

export type MessagePage = {
  messages: ChatMessage[];
  nextCursor: string | null;
};

const messageListSelect = {
  id: true,
  body: true,
  createdAt: true,
  author: { select: { id: true, name: true, email: true, image: true } },
  attachments: {
    select: {
      id: true,
      fileId: true,
      file: { select: { name: true, mimeType: true, size: true, status: true } },
    },
  },
} as const;

function mapRow(row: {
  id: string;
  body: string;
  createdAt: Date;
  author: ChatMessage["author"];
  attachments: {
    id: string;
    fileId: string;
    file: { name: string; mimeType: string; size: number; status: string };
  }[];
}): ChatMessage {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    author: row.author,
    attachments: row.attachments
      .filter((item) => item.file.status === "READY")
      .map((item) => ({
        id: item.id,
        fileId: item.fileId,
        name: item.file.name,
        mimeType: item.file.mimeType,
        size: item.file.size,
      })),
  };
}

export async function getMessages(channelId: string, cursor?: string): Promise<MessagePage | null> {
  const actor = await requireUser();
  const membership = await db.channelMember.findUnique({
    where: { channelId_userId: { channelId, userId: actor.id } },
    select: { userId: true },
  });
  if (
    !can(actor, "message.send", {
      type: "message",
      isMember: Boolean(membership),
      authorId: actor.id,
    })
  ) {
    return null;
  }

  const cursorRow: { id: string; createdAt: Date } | null = cursor
    ? await db.message.findFirst({
        where: { id: cursor, channelId, deletedAt: null },
        select: { id: true, createdAt: true },
      })
    : null;
  if (cursor && !cursorRow) {
    return { messages: [], nextCursor: null };
  }

  const rows = await db.message.findMany({
    where: {
      channelId,
      deletedAt: null,
      ...(cursorRow
        ? {
            OR: [
              { createdAt: { lt: cursorRow.createdAt } },
              { AND: [{ createdAt: cursorRow.createdAt }, { id: { lt: cursorRow.id } }] },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MESSAGE_PAGE_SIZE + 1,
    select: messageListSelect,
  });

  const mapped = rows.map(mapRow);
  return sliceNewestPage(mapped);
}

export { messageListSelect, mapRow };
