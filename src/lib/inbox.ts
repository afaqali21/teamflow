import { db } from "@/lib/db";

export type InboxItem = {
  id: string;
  href: string;
  title: string;
  detail: string | null;
  unread: number;
  kind: "direct" | "project";
};

type UnreadRow = {
  channelId: string;
  unread: number | bigint;
};

export async function unreadCounts(userId: string): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<UnreadRow[]>`
    SELECT cm."channelId" AS "channelId", COUNT(m.id)::int AS unread
    FROM "ChannelMember" cm
    LEFT JOIN "Message" m
      ON m."channelId" = cm."channelId"
      AND m."deletedAt" IS NULL
      AND m."authorId" <> ${userId}
      AND (cm."lastReadAt" IS NULL OR m."createdAt" > cm."lastReadAt")
    WHERE cm."userId" = ${userId}
    GROUP BY cm."channelId"
  `;
  return new Map(rows.map((row) => [row.channelId, Number(row.unread)]));
}

export async function countUnread(userId: string): Promise<number> {
  const counts = await unreadCounts(userId);
  let total = 0;
  for (const count of counts.values()) {
    total += count;
  }
  return total;
}

export async function listInbox(userId: string): Promise<InboxItem[]> {
  const [memberships, counts] = await Promise.all([
    db.channelMember.findMany({
      where: { userId },
      select: {
        channel: {
          select: {
            id: true,
            type: true,
            name: true,
            projectId: true,
            project: { select: { name: true } },
            members: {
              select: {
                user: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
      },
    }),
    unreadCounts(userId),
  ]);

  const items: InboxItem[] = memberships.map((membership) => {
    const channel = membership.channel;
    const unread = counts.get(channel.id) ?? 0;
    if (channel.type === "DM") {
      const other = channel.members.find((member) => member.user.id !== userId)?.user;
      return {
        id: channel.id,
        href: `/chat/${channel.id}`,
        title: other?.name?.trim() || other?.email || "Direct message",
        detail: null,
        unread,
        kind: "direct",
      };
    }

    return {
      id: channel.id,
      href: channel.projectId ? `/projects/${channel.projectId}?tab=chat` : "/chat",
      title: channel.project?.name ?? "Project",
      detail: channel.name,
      unread,
      kind: "project",
    };
  });

  return items.sort((left, right) => {
    if (left.unread !== right.unread) {
      return right.unread - left.unread;
    }
    return left.title.localeCompare(right.title);
  });
}
