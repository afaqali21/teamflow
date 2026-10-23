import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { displayAvatar } from "@/lib/display-avatar";
import { countUnread } from "@/lib/inbox";
import { listNotifications } from "@/lib/notifications";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <p className="px-6 py-10 text-sm text-muted-foreground">Loading your workspace...</p>
      }
    >
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [avatarUrl, chatUnread, notifications] = await Promise.all([
    displayAvatar(user.id, user.image),
    countUnread(user.id),
    listNotifications(user.id),
  ]);

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl,
        canCreateProject: can(user, "projects.create"),
        canManageUsers: can(user, "users.list"),
        chatUnread,
      }}
      notifications={notifications}
      pusherKey={process.env.NEXT_PUBLIC_PUSHER_KEY ?? null}
      pusherCluster={process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? process.env.PUSHER_CLUSTER ?? null}
    >
      {children}
    </AppShell>
  );
}
