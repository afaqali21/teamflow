import { ChannelChat } from "@/components/chat/channel-chat";
import type { ChatAuthor } from "@/lib/chat-message";
import { db } from "@/lib/db";
import { displayAvatar } from "@/lib/display-avatar";
import { getMessages } from "@/lib/messages";
import { presentMessages } from "@/lib/present-chat";
import { requireUser } from "@/lib/session";

export async function MemberChannel({ channelId }: { channelId: string }) {
  const [actor, page, channel] = await Promise.all([
    requireUser(),
    getMessages(channelId),
    db.channel.findUnique({
      where: { id: channelId },
      select: { projectId: true },
    }),
  ]);
  if (!page) {
    return <p className="text-sm text-muted-foreground">You do not have access to this channel.</p>;
  }

  const projectId = channel?.projectId ?? null;
  const projectFiles =
    projectId === null
      ? []
      : await db.file.findMany({
          where: { projectId, status: "READY" },
          select: { id: true, name: true, mimeType: true, size: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

  const self: ChatAuthor = {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    avatarUrl: await displayAvatar(actor.id, actor.image),
  };

  return (
    <ChannelChat
      channelId={channelId}
      projectId={projectId}
      projectFiles={projectFiles}
      self={self}
      initialMessages={[...(await presentMessages(page.messages))].reverse()}
      initialCursor={page.nextCursor}
      pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY ?? null}
      pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? process.env.PUSHER_CLUSTER ?? null}
    />
  );
}
