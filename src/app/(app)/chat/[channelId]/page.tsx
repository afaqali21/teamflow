import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MemberChannel } from "@/components/chat/member-channel";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

type DirectChannel = {
  id: string;
  members: { user: { id: string; name: string | null; email: string } }[];
};

export default function DirectMessagePage({ params }: { params: Promise<{ channelId: string }> }) {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading conversation...</p>
        </PageFrame>
      }
    >
      <DirectPanel params={params} />
    </Suspense>
  );
}

async function DirectPanel({ params }: { params: Promise<{ channelId: string }> }) {
  const actor = await requireUser();
  const { channelId } = await params;
  const channel: DirectChannel | null = await db.channel.findFirst({
    where: { id: channelId, type: "DM" },
    select: {
      id: true,
      members: { select: { user: { select: { id: true, name: true, email: true } } } },
    },
  });
  const isMember = Boolean(channel?.members.some((member) => member.user.id === actor.id));
  if (
    !channel ||
    !can(actor, "message.send", { type: "message", isMember, authorId: actor.id })
  ) {
    notFound();
  }

  const other = channel.members.find((member) => member.user.id !== actor.id)?.user;
  const title = other?.name?.trim() || other?.email || "Direct message";

  return (
    <PageFrame
      crumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Chat", href: "/chat" },
        { label: title },
      ]}
    >
      <PageHeader eyebrow="Direct message" title={title} />
      <SurfaceCard>
        <MemberChannel channelId={channel.id} />
      </SurfaceCard>
    </PageFrame>
  );
}
