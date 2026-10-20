"use client";

import { Bell, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOutUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/roles";

export type ShellUser = {
  name: string | null;
  email: string;
  role: Role;
  avatarUrl: string | null;
};

const links = [
  { href: "/projects", label: "Projects" },
  { href: "/chat", label: "Chat" },
  { href: "/tasks", label: "My Tasks" },
  { href: "/files", label: "Files" },
] as const;

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const [accountPath, setAccountPath] = useState<string | null>(null);
  const [noticesPath, setNoticesPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const accountOpen = accountPath === pathname;
  const noticesOpen = noticesPath === pathname;
  const displayName = user.name?.trim() || user.email;

  return (
    <div className="flex min-h-screen w-full flex-1 bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <Sidebar user={user} pathname={pathname} displayName={displayName} />
      </aside>

      {menuOpen ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuPath(null)}
          />
          <aside className="relative flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <Sidebar user={user} pathname={pathname} displayName={displayName} />
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-2 border-b px-3 md:px-4">
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
          <p className="text-sm font-medium md:hidden">Teamflow</p>
          <div className="ml-auto flex items-center gap-1">
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Notifications"
                aria-expanded={noticesOpen}
                onClick={() => {
                  setNoticesPath(noticesOpen ? null : pathname);
                  setAccountPath(null);
                }}
              >
                <Bell />
              </Button>
              {noticesOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-64 rounded-lg border bg-popover p-3 text-sm text-muted-foreground shadow-md">
                  No notifications yet.
                </div>
              ) : null}
            </div>
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                aria-expanded={accountOpen}
                onClick={() => {
                  setAccountPath(accountOpen ? null : pathname);
                  setNoticesPath(null);
                }}
              >
                {displayName}
              </Button>
              {accountOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-52 rounded-lg border bg-popover p-2 shadow-md">
                  <p className="truncate px-2 py-1 text-xs text-muted-foreground">{user.email}</p>
                  <Link href="/profile" className="block rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                    Profile
                  </Link>
                  <form action={signOutUser}>
                    <button
                      type="submit"
                      className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
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
}: {
  user: ShellUser;
  pathname: string;
  displayName: string;
}) {
  const items = user.role === "ADMIN" ? [...links, { href: "/admin/users", label: "Admin" }] : links;

  return (
    <>
      <div className="flex items-center gap-3 border-b border-sidebar-border px-4 py-4">
        <Avatar user={user} name={displayName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{user.role}</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm ${
                active ? "bg-sidebar-accent font-medium" : "hover:bg-sidebar-accent"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
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
