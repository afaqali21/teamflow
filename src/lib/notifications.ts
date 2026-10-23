import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { sendAssignmentEmail } from "@/lib/email";
import type { ShellNotification } from "@/lib/notification-item";
import { getPusher } from "@/lib/pusher";
import { userChannelName } from "@/lib/user-channel";

const NOTICE_LIMIT = 20;
const NOTICE_EVENT = "notification";

type NoticeType = "TASK_ASSIGNED" | "TASK_STATUS_CHANGED" | "MENTION";

export async function listNotifications(userId: string): Promise<{
  unreadCount: number;
  items: ShellNotification[];
}> {
  const [rows, unreadCount]: [
    { id: string; title: string; body: string | null; link: string | null; readAt: Date | null; createdAt: Date }[],
    number,
  ] = await Promise.all([
    db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: NOTICE_LIMIT,
      select: { id: true, title: true, body: true, link: true, readAt: true, createdAt: true },
    }),
    db.notification.count({ where: { userId, readAt: null } }),
  ]);

  return {
    unreadCount,
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      body: row.body,
      link: row.link,
      readAt: row.readAt ? row.readAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

export async function notifyUsers(input: {
  userIds: string[];
  actorId: string;
  type: NoticeType;
  title: string;
  body: string | null;
  link: string | null;
  email?: { subject: string; text: string };
}) {
  const ids = [...new Set(input.userIds.filter((id) => id.length > 0 && id !== input.actorId))];
  if (ids.length === 0) {
    return;
  }

  try {
    const recipients: { id: string; email: string }[] = await db.user.findMany({
      where: { id: { in: ids }, isActive: true },
      select: { id: true, email: true },
    });
    let createdAny = false;
    for (const recipient of recipients) {
      try {
        const created: { id: string; title: string; body: string | null; link: string | null; createdAt: Date } =
          await db.notification.create({
            data: {
              userId: recipient.id,
              type: input.type,
              title: input.title,
              body: input.body,
              link: input.link,
            },
            select: { id: true, title: true, body: true, link: true, createdAt: true },
          });
        createdAny = true;
        await publishNotice(recipient.id, {
          id: created.id,
          title: created.title,
          body: created.body,
          link: created.link,
          readAt: null,
          createdAt: created.createdAt.toISOString(),
        });
        if (input.type === "TASK_ASSIGNED" && input.email) {
          await sendAssignmentEmail({ to: recipient.email, ...input.email });
        }
      } catch (error) {
        console.error("Notification failed.", error);
      }
    }
    if (createdAny) {
      revalidatePath("/", "layout");
    }
  } catch (error) {
    console.error("Notification failed.", error);
  }
}

async function publishNotice(userId: string, payload: ShellNotification) {
  const pusher = getPusher();
  if (!pusher) {
    return;
  }
  try {
    await pusher.trigger(userChannelName(userId), NOTICE_EVENT, payload);
  } catch (error) {
    console.error("Pusher notification failed.", error);
  }
}
