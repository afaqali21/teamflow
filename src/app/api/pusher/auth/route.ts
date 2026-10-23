import { auth } from "@/auth";
import { db } from "@/lib/db";
import { channelIdFromPusherName } from "@/lib/message-page";
import { can } from "@/lib/permissions";
import { getPusher } from "@/lib/pusher";
import { userIdFromPusherName } from "@/lib/user-channel";

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response("Forbidden", { status: 403 });
  }

  const user: { id: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE"; isActive: boolean } | null =
    await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isActive: true },
    });
  if (!user?.isActive) {
    return new Response("Forbidden", { status: 403 });
  }

  const body = await request.formData();
  const socketId = body.get("socket_id");
  const channelName = body.get("channel_name");
  if (typeof socketId !== "string" || typeof channelName !== "string") {
    return new Response("Forbidden", { status: 403 });
  }

  const noticeUserId = userIdFromPusherName(channelName);
  if (noticeUserId) {
    if (!can(user, "notification.read", { type: "notification", ownerId: noticeUserId })) {
      return new Response("Forbidden", { status: 403 });
    }
  } else {
    const channelId = channelIdFromPusherName(channelName);
    if (!channelId) {
      return new Response("Forbidden", { status: 403 });
    }
    const membership = await db.channelMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.id } },
      select: { userId: true },
    });
    if (
      !can(user, "message.send", {
        type: "message",
        isMember: Boolean(membership),
        authorId: user.id,
      })
    ) {
      return new Response("Forbidden", { status: 403 });
    }
  }

  const pusher = getPusher();
  if (!pusher) {
    return new Response("Chat is not configured.", { status: 503 });
  }

  return Response.json(pusher.authorizeChannel(socketId, channelName));
}
