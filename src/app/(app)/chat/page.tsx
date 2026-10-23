import { Suspense } from "react";
import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { StartDirectMessageForm } from "@/components/chat/start-direct-message-form";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import type { InboxItem } from "@/lib/inbox";
import { listInbox } from "@/lib/inbox";
import { requireUser } from "@/lib/session";

type PersonOption = {
  id: string;
  name: string | null;
  email: string;
};

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading chat...</p>
        </PageFrame>
      }
    >
      <ChatPanel />
    </Suspense>
  );
}

async function ChatPanel() {
  const actor = await requireUser();
  const [items, people]: [InboxItem[], PersonOption[]] = await Promise.all([
    listInbox(actor.id),
    db.user.findMany({
      where: { isActive: true, id: { not: actor.id } },
      select: { id: true, name: true, email: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
    }),
  ]);
  const direct = items.filter((item) => item.kind === "direct");
  const projects = items.filter((item) => item.kind === "project");

  return (
    <PageFrame crumbs={[{ label: "Dashboard", href: "/" }, { label: "Chat" }]}>
      <PageHeader
        title="Chat"
        description="Direct messages and project channels you belong to."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SurfaceCard>
          <h2 className="mb-4 text-lg font-semibold">Direct messages</h2>
          {direct.length === 0 ? (
            <p className="mb-4 text-sm text-muted-foreground">No direct messages yet.</p>
          ) : (
            <ChannelList items={direct} />
          )}
          <div className="mt-4 border-t border-border pt-4">
            <StartDirectMessageForm
              people={people.map((person) => ({
                id: person.id,
                label: person.name?.trim() || person.email,
              }))}
            />
          </div>
        </SurfaceCard>
        <SurfaceCard>
          <h2 className="mb-4 text-lg font-semibold">Project channels</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">You are not in a project channel yet.</p>
          ) : (
            <ChannelList items={projects} />
          )}
        </SurfaceCard>
      </div>
    </PageFrame>
  );
}

function ChannelList({ items }: { items: InboxItem[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-muted"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e2dfff] text-primary">
                <MessageSquare className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{item.title}</span>
                {item.detail ? (
                  <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                ) : null}
              </span>
            </span>
            {item.unread > 0 ? (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {item.unread > 99 ? "99+" : item.unread}
              </span>
            ) : (
              <span className="size-2 rounded-full bg-secondary" />
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
