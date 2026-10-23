"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { readLiveNotification, type ShellNotification } from "@/lib/notification-item";
import { userChannelName } from "@/lib/user-channel";

export function NotificationBell({
  open,
  onToggle,
  onClose,
  userId,
  unreadCount,
  items,
  pusherKey,
  pusherCluster,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  userId: string;
  unreadCount: number;
  items: ShellNotification[];
  pusherKey: string | null;
  pusherCluster: string | null;
}) {
  const [rows, setRows] = useState(items);
  const [unread, setUnread] = useState(unreadCount);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [serverItems, setServerItems] = useState(items);
  const [serverUnread, setServerUnread] = useState(unreadCount);
  const seen = useRef(new Set(items.map((item) => item.id)));

  if (items !== serverItems || unreadCount !== serverUnread) {
    setServerItems(items);
    setServerUnread(unreadCount);
    setRows(items);
    setUnread(unreadCount);
  }

  useEffect(() => {
    for (const item of rows) {
      seen.current.add(item.id);
    }
  }, [rows]);

  useEffect(() => {
    if (!pusherKey || !pusherCluster) {
      return;
    }
    let active = true;
    let connection: { unsubscribe: (name: string) => void; disconnect: () => void } | null = null;
    const name = userChannelName(userId);
    void import("pusher-js").then((mod) => {
      if (!active) {
        return;
      }
      const client = new mod.default(pusherKey, {
        cluster: pusherCluster,
        authEndpoint: "/api/pusher/auth",
      });
      connection = client;
      const channel = client.subscribe(name);
      channel.bind("notification", (payload: unknown) => {
        const incoming = readLiveNotification(payload);
        if (!incoming || seen.current.has(incoming.id)) {
          return;
        }
        seen.current.add(incoming.id);
        setRows((current) => [incoming, ...current].slice(0, 20));
        setUnread((count) => count + 1);
      });
    });
    return () => {
      active = false;
      connection?.unsubscribe(name);
      connection?.disconnect();
    };
  }, [pusherCluster, pusherKey, userId]);

  async function markOne(id: string) {
    const current = rows.find((item) => item.id === id);
    if (!current || current.readAt) {
      return;
    }
    const readAt = new Date().toISOString();
    setRows((list) => list.map((item) => (item.id === id ? { ...item, readAt } : item)));
    setUnread((count) => Math.max(0, count - 1));
    const result = await markNotificationRead(id);
    if (result.error) {
      setRows((list) => list.map((item) => (item.id === id ? { ...item, readAt: null } : item)));
      setUnread((count) => count + 1);
      setError(result.error);
    }
  }

  async function markAll() {
    if (unread === 0 || pending) {
      return;
    }
    const previous = rows;
    const previousUnread = unread;
    const readAt = new Date().toISOString();
    setPending(true);
    setError(null);
    setRows((list) => list.map((item) => (item.readAt ? item : { ...item, readAt })));
    setUnread(0);
    const result = await markAllNotificationsRead();
    setPending(false);
    if (result.error) {
      setRows(previous);
      setUnread(previousUnread);
      setError(result.error);
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        onClick={onToggle}
      >
        <Bell />
        {unread > 0 ? (
          <span className="absolute top-1 right-1 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border bg-popover p-2 text-sm shadow-md">
          <div className="flex items-center justify-between gap-2 px-2 py-1">
            <p className="font-medium">Notifications</p>
            {unread > 0 ? (
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => void markAll()}>
                {pending ? "Marking..." : "Mark all as read"}
              </Button>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="px-2 py-1 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          {rows.length === 0 ? (
            <p className="px-2 py-3 text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {rows.map((item) => (
                <li key={item.id}>
                  {item.link ? (
                    <Link
                      href={item.link}
                      className="block rounded-md px-2 py-2 hover:bg-muted"
                      onClick={() => {
                        void markOne(item.id);
                        onClose();
                      }}
                    >
                      <Notice item={item} />
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                      onClick={() => void markOne(item.id)}
                    >
                      <Notice item={item} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Notice({ item }: { item: ShellNotification }) {
  return (
    <>
      <p className={item.readAt ? "text-muted-foreground" : "font-medium"}>
        {item.title}
      </p>
      {item.body ? <p className="mt-1 line-clamp-2 text-muted-foreground">{item.body}</p> : null}
      <p className="mt-1 text-xs text-muted-foreground">{formatWhen(item.createdAt)}</p>
    </>
  );
}

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
