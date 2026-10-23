"use client";

import {
  CheckCircle2,
  FolderOpen,
  LayoutDashboard,
  Lock,
  Menu,
  MessageSquare,
  MoreVertical,
  Network,
  Paperclip,
  Plus,
  Search,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutUser } from "@/actions/auth";
import { GlobalSearchField } from "@/components/shell/global-search-field";
import { NotificationBell } from "@/components/shell/notification-bell";
import { Button } from "@/components/ui/button";
import type { ShellNotification } from "@/lib/notification-item";
import type { Role } from "@/lib/roles";

export type ShellUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  avatarUrl: string | null;
  canCreateProject: boolean;
  canManageUsers: boolean;
  chatUnread: number;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "chat" | "lock";
};

const mainLinks: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderOpen },
  { href: "/chat", label: "Chat", icon: MessageSquare, badge: "chat" },
  { href: "/tasks", label: "My Tasks", icon: CheckCircle2 },
  { href: "/files", label: "Files", icon: Paperclip },
];

export function AppShell({
  user,
  notifications,
  pusherKey,
  pusherCluster,
  children,
}: {
  user: ShellUser;
  notifications: { unreadCount: number; items: ShellNotification[] };
  pusherKey: string | null;
  pusherCluster: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [accountPath, setAccountPath] = useState<string | null>(null);
  const [noticesPath, setNoticesPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const accountOpen = accountPath === pathname;
  const noticesOpen = noticesPath === pathname;
  const displayName = user.name?.trim() || user.email;

  return (
    <div className="flex min-h-screen w-full flex-1 bg-surface">
      <aside className="sticky top-0 hidden h-svh w-[260px] shrink-0 flex-col overflow-y-auto bg-surface-low shadow-[0_1px_8px_rgba(0,0,0,0.04)] md:flex">
        <Sidebar
          user={user}
          pathname={pathname}
          displayName={displayName}
          accountOpen={accountOpen}
          onToggleAccount={() => {
            setAccountPath(accountOpen ? null : pathname);
            setNoticesPath(null);
          }}
        />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuPath(null)}
          />
          <aside className="relative flex h-full w-[260px] flex-col bg-surface-low shadow-lg">
            <Sidebar
              user={user}
              pathname={pathname}
              displayName={displayName}
              accountOpen={accountOpen}
              onToggleAccount={() => {
                setAccountPath(accountOpen ? null : pathname);
                setNoticesPath(null);
              }}
            />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-transparent bg-surface/80 px-3 shadow-[0_1px_8px_rgba(0,0,0,0.04)] backdrop-blur-xl md:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
            onClick={() => setMenuPath(pathname)}
          >
            <Menu />
          </Button>
          <GlobalSearchField />
          <p className="text-sm font-medium md:hidden">Teamflow</p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/search"
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
              aria-label="Search"
            >
              <Search className="size-4" />
            </Link>
            <NotificationBell
              open={noticesOpen}
              onToggle={() => {
                setNoticesPath(noticesOpen ? null : pathname);
                setAccountPath(null);
              }}
              onClose={() => setNoticesPath(null)}
              userId={user.id}
              unreadCount={notifications.unreadCount}
              items={notifications.items}
              pusherKey={pusherKey}
              pusherCluster={pusherCluster}
            />
            {user.canCreateProject ? (
              <Link
                href="/projects#new"
                className="hidden h-10 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 sm:inline-flex"
              >
                <Plus className="size-4" />
                New
              </Link>
            ) : null}
          </div>
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function Sidebar({
  user,
  pathname,
  displayName,
  accountOpen,
  onToggleAccount,
}: {
  user: ShellUser;
  pathname: string;
  displayName: string;
  accountOpen: boolean;
  onToggleAccount: () => void;
}) {
  const items: NavItem[] = [
    ...mainLinks,
    ...(user.canManageUsers
      ? [{ href: "/admin", label: "Admin", icon: Shield, badge: "lock" as const }]
      : []),
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col justify-between py-4">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-4 pb-6">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-[#4f46e5] text-primary-foreground shadow-sm">
              <Network className="size-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Teamflow</span>
          </div>
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {items.map((item) => {
            const path = item.href.split("#")[0] ?? item.href;
            const active =
              path === "/"
                ? pathname === "/"
                : pathname === path || pathname.startsWith(`${path}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={
                  item.badge === "chat" && user.chatUnread > 0
                    ? `Chat, ${user.chatUnread} unread`
                    : undefined
                }
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-[#4f46e5] font-medium text-white shadow-sm"
                    : "text-muted-foreground hover:bg-surface-high hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="size-5" />
                  <span>{item.label}</span>
                </span>
                {item.badge === "chat" && user.chatUnread > 0 ? (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      active ? "bg-white/20 text-white" : "bg-surface-high text-muted-foreground"
                    }`}
                  >
                    {user.chatUnread > 99 ? "99+" : user.chatUnread}
                  </span>
                ) : null}
                {item.badge === "chat" && user.chatUnread === 0 ? (
                  <span className="size-2 rounded-full bg-secondary" />
                ) : null}
                {item.badge === "lock" ? <Lock className="size-4 text-outline" /> : null}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="relative px-2 pt-4">
        <div className="flex items-center justify-between rounded-xl bg-card p-2 shadow-[0_1px_3px_0_rgba(15,23,42,0.04)]">
          <div className="flex min-w-0 items-center gap-2">
            <Avatar user={user} name={displayName} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
              <span className="mt-0.5 inline-flex rounded-full bg-[#eaddff] px-1.5 py-0.5 text-[10px] font-semibold text-[#25005a]">
                {user.role === "ADMIN" ? "Admin" : user.role === "MANAGER" ? "Manager" : "Employee"}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="User menu"
            aria-expanded={accountOpen}
            onClick={onToggleAccount}
          >
            <MoreVertical className="size-5" />
          </Button>
        </div>
        {accountOpen ? (
          <div className="absolute right-2 bottom-14 z-30 w-52 rounded-xl border border-border bg-popover p-2 shadow-md">
            <p className="truncate px-2 py-1 text-xs text-muted-foreground">{user.email}</p>
            <Link href="/profile" className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              Profile
            </Link>
            {user.canCreateProject ? (
              <Link href="/projects#new" className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted md:hidden">
                New project
              </Link>
            ) : null}
            <form action={signOutUser}>
              <button type="submit" className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted">
                Sign out
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Avatar({ user, name }: { user: ShellUser; name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  if (user.avatarUrl) {
    return (
      // Presigned R2 URLs change on every request, so the image optimizer cannot cache them.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
    );
  }

  return (
    <span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
      {initial}
    </span>
  );
}
