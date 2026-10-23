import { MemberChannel } from "@/components/chat/member-channel";
import { db } from "@/lib/db";

export async function ProjectChat({ projectId }: { projectId: string }) {
  const channel: { id: string } | null = await db.channel.findFirst({
    where: { projectId, type: "PROJECT", name: "general" },
    select: { id: true },
  });
  if (!channel) {
    return <p className="text-sm text-muted-foreground">This project has no chat channel yet.</p>;
  }

  return <MemberChannel channelId={channel.id} />;
}
