"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Pusher from "pusher-js";
import { Paperclip, X } from "lucide-react";
import {
  deleteMessage,
  editMessage,
  loadOlderMessages,
  sendMessage,
} from "@/actions/messages";
import { markChannelRead } from "@/actions/direct-messages";
import { FilePreviewCard } from "@/components/files/file-preview";
import { Button } from "@/components/ui/button";
import { canSendMessagePayload, MAX_MESSAGE_ATTACHMENTS } from "@/lib/attachments";
import type { ChatAuthor, ClientAttachment, ClientMessage } from "@/lib/chat-message";
import {
  readDeletedMessageId,
  readLiveMessage,
  removeMessage,
  upsertMessage,
} from "@/lib/chat-message";
import { formatFileSize } from "@/lib/project-files";
import { pusherChannelName } from "@/lib/message-page";

type Row = ClientMessage & { status?: "sending" | "failed"; pendingFileIds?: string[] };

type ProjectFileOption = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
};

export function ChannelChat({
  channelId,
  projectId,
  projectFiles,
  self,
  initialMessages,
  initialCursor,
  pusherKey,
  pusherCluster,
}: {
  channelId: string;
  projectId: string | null;
  projectFiles: ProjectFileOption[];
  self: ChatAuthor;
  initialMessages: ClientMessage[];
  initialCursor: string | null;
  pusherKey: string | null;
  pusherCluster: string | null;
}) {
  const [messages, setMessages] = useState<Row[]>(initialMessages);
  const [text, setText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<ProjectFileOption[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderError, setOlderError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const pendingAdjust = useRef<number | null>(null);
  const cursorRef = useRef(initialCursor);
  const loadingOlderRef = useRef(false);
  const loadOlderRef = useRef<() => Promise<void>>(async () => {});
  const selfRef = useRef(self);
  const selectedRef = useRef(selectedFiles);

  useLayoutEffect(() => {
    const list = listRef.current;
    if (!list) {
      return;
    }
    if (pendingAdjust.current !== null) {
      list.scrollTop += list.scrollHeight - pendingAdjust.current;
      pendingAdjust.current = null;
      return;
    }
    if (stick.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!pusherKey || !pusherCluster) {
      return;
    }
    const client = new Pusher(pusherKey, {
      cluster: pusherCluster,
      authEndpoint: "/api/pusher/auth",
    });
    const channel = client.subscribe(pusherChannelName(channelId));
    channel.bind("message", (payload: unknown) => {
      const incoming = readLiveMessage(payload);
      if (!incoming) {
        return;
      }
      setMessages((current) =>
        upsertMessage(current, withKnownAvatar(current, incoming, selfRef.current)),
      );
    });
    channel.bind("message-updated", (payload: unknown) => {
      const incoming = readLiveMessage(payload);
      if (!incoming) {
        return;
      }
      setMessages((current) =>
        upsertMessage(current, withKnownAvatar(current, incoming, selfRef.current)),
      );
    });
    channel.bind("message-deleted", (payload: unknown) => {
      const id = readDeletedMessageId(payload);
      if (!id) {
        return;
      }
      setMessages((current) => removeMessage(current, id));
    });
    return () => {
      client.unsubscribe(pusherChannelName(channelId));
      client.disconnect();
    };
  }, [channelId, pusherCluster, pusherKey]);

  useEffect(() => {
    const list = listRef.current;
    const top = topRef.current;
    if (!list || !top) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadOlderRef.current();
        }
      },
      { root: list, threshold: 0.1 },
    );
    observer.observe(top);
    return () => observer.disconnect();
  }, [channelId]);

  async function loadOlder() {
    const nextCursor = cursorRef.current;
    const list = listRef.current;
    const nearTop = !list || list.scrollHeight <= list.clientHeight + 8 || list.scrollTop <= 48;
    if (!nextCursor || loadingOlderRef.current || !nearTop) {
      return;
    }
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    setOlderError(null);
    const result = await loadOlderMessages(channelId, nextCursor);
    loadingOlderRef.current = false;
    setLoadingOlder(false);
    if (result.error) {
      setOlderError(result.error);
      return;
    }
    pendingAdjust.current = listRef.current ? listRef.current.scrollHeight : null;
    setMessages((current) => prependOlder(current, result.messages));
    cursorRef.current = result.nextCursor;
  }

  useLayoutEffect(() => {
    selfRef.current = self;
    selectedRef.current = selectedFiles;
    loadOlderRef.current = loadOlder;
  });

  useEffect(() => {
    if (stick.current) {
      void markChannelRead(channelId);
    }
  }, [channelId, messages]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || olderError || !cursorRef.current || loadingOlderRef.current) {
      return;
    }
    if (list.scrollHeight <= list.clientHeight + 8) {
      void loadOlderRef.current();
    }
  }, [messages, olderError]);

  function toggleFile(file: ProjectFileOption) {
    setSelectedFiles((current) => {
      if (current.some((item) => item.id === file.id)) {
        return current.filter((item) => item.id !== file.id);
      }
      if (current.length >= MAX_MESSAGE_ATTACHMENTS) {
        setActionError(`Attach up to ${MAX_MESSAGE_ATTACHMENTS} files.`);
        return current;
      }
      setActionError(null);
      return [...current, file];
    });
  }

  async function submit(body: string, pendingId?: string, fileIds?: string[]) {
    const trimmed = body.trim();
    const ids = fileIds ?? selectedFiles.map((file) => file.id);
    if (!canSendMessagePayload(trimmed, ids) || sending) {
      return;
    }
    const optimisticAttachments: ClientAttachment[] = (
      fileIds
        ? projectFiles.filter((file) => fileIds.includes(file.id))
        : selectedFiles
    ).map((file) => ({
      id: `pending-${file.id}`,
      fileId: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
    }));
    const tempId = pendingId ?? `pending-${crypto.randomUUID()}`;
    stick.current = true;
    setSending(true);
    setActionError(null);
    if (!pendingId) {
      setText("");
      setSelectedFiles([]);
      setPickerOpen(false);
      setMessages((current) => [
        ...current,
        {
          id: tempId,
          body: trimmed,
          createdAt: new Date().toISOString(),
          author: self,
          attachments: optimisticAttachments,
          pendingFileIds: ids,
          status: "sending",
        },
      ]);
    } else {
      setMessages((current) =>
        current.map((message) =>
          message.id === tempId ? { ...message, status: "sending" } : message,
        ),
      );
    }

    const result = await sendMessage(channelId, trimmed, ids);
    setSending(false);
    if (result.error || !result.message) {
      setMessages((current) =>
        current.map((message) =>
          message.id === tempId ? { ...message, status: "failed" } : message,
        ),
      );
      setActionError(result.error ?? "The message could not be sent.");
      return;
    }
    const saved = result.message;
    setMessages((current) => upsertMessage(removeMessage(current, tempId), saved));
  }

  async function saveEdit(messageId: string) {
    const result = await editMessage(messageId, draft);
    if (result.error || !result.message) {
      setActionError(result.error ?? "The message could not be edited.");
      return;
    }
    const saved = result.message;
    setMessages((current) => upsertMessage(current, saved));
    setEditingId(null);
    setActionError(null);
  }

  async function remove(message: Row) {
    setMessages((current) => removeMessage(current, message.id));
    setConfirmDeleteId(null);
    const result = await deleteMessage(message.id);
    if (result.error) {
      setMessages((current) => upsertMessage(current, message));
      setActionError(result.error);
    }
  }

  const canAttach = Boolean(projectId);
  const canSend = canSendMessagePayload(text, selectedFiles.map((file) => file.id));

  return (
    <section className="flex flex-col gap-4">
      <div
        ref={listRef}
        onScroll={(event) => {
          const list = event.currentTarget;
          const nextStick = list.scrollHeight - list.scrollTop - list.clientHeight < 48;
          if (nextStick && !stick.current) {
            void markChannelRead(channelId);
          }
          stick.current = nextStick;
        }}
        className={
          messages.length === 0
            ? "rounded-xl bg-surface-low/70 px-4 py-5"
            : "max-h-[min(28rem,50vh)] overflow-y-auto rounded-xl bg-surface-low/70 px-3 py-3"
        }
      >
        <div ref={topRef} />
        {loadingOlder ? (
          <p className="mb-2 text-xs text-muted-foreground">Loading older messages...</p>
        ) : null}
        {olderError ? (
          <p role="alert" className="mb-2 text-sm text-destructive">
            {olderError}
          </p>
        ) : null}
        {messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hello to start the conversation.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {messages.map((message) => {
              const isOwn = message.author.id === self.id;
              const mine = isOwn && !message.status;
              const name = message.author.name?.trim() || message.author.email;
              const attachments = message.attachments ?? [];
              return (
                <article
                  key={message.id}
                  className={`flex gap-2.5 ${isOwn ? "flex-row-reverse" : ""}`}
                >
                  <Avatar author={message.author} name={name} />
                  <div className={`min-w-0 max-w-[85%] sm:max-w-[75%] ${isOwn ? "items-end text-right" : ""}`}>
                    <p className={`text-xs ${isOwn ? "text-right" : ""}`}>
                      <span className="font-semibold text-foreground">{name}</span>{" "}
                      <time dateTime={message.createdAt} className="text-muted-foreground">
                        {formatTime(message.createdAt)}
                      </time>
                    </p>
                    {editingId === message.id ? (
                      <div className="mt-1.5 flex flex-col gap-2 text-left">
                        <textarea
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          rows={2}
                          maxLength={4000}
                          aria-label="Edit message"
                          className="w-full rounded-xl border-0 bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
                        />
                        <div className="flex gap-2">
                          <Button type="button" size="sm" onClick={() => void saveEdit(message.id)}>
                            Save
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className={`mt-1 flex flex-col gap-2 ${isOwn ? "items-end" : "items-start"}`}>
                        {message.body ? (
                          <div
                            className={`inline-block rounded-2xl px-3.5 py-2 text-left text-sm whitespace-pre-wrap ${
                              isOwn
                                ? "rounded-br-md bg-primary text-primary-foreground"
                                : "rounded-bl-md bg-card text-foreground shadow-sm"
                            }`}
                          >
                            {message.body}
                          </div>
                        ) : null}
                        {attachments.length > 0 ? (
                          <ul className={`flex flex-col gap-2 ${isOwn ? "items-end" : "items-start"}`}>
                            {attachments.map((item) => (
                              <li key={item.id}>
                                <FilePreviewCard
                                  compact
                                  file={{
                                    fileId: item.fileId,
                                    name: item.name,
                                    mimeType: item.mimeType,
                                    size: item.size,
                                  }}
                                />
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    )}
                    {message.status === "sending" ? (
                      <p className="mt-1 text-xs text-muted-foreground">Sending...</p>
                    ) : null}
                    {message.status === "failed" ? (
                      <p className="mt-1 text-xs text-destructive">
                        Not sent.{" "}
                        <button
                          type="button"
                          className="underline"
                          onClick={() =>
                            void submit(message.body, message.id, message.pendingFileIds ?? [])
                          }
                        >
                          Retry
                        </button>
                      </p>
                    ) : null}
                    {mine && editingId !== message.id ? (
                      <div className={`mt-1 flex gap-3 text-xs ${isOwn ? "justify-end" : ""}`}>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setEditingId(message.id);
                            setDraft(message.body);
                            setConfirmDeleteId(null);
                          }}
                        >
                          Edit
                        </button>
                        {confirmDeleteId === message.id ? (
                          <>
                            <button
                              type="button"
                              className="text-destructive"
                              onClick={() => void remove(message)}
                            >
                              Confirm delete
                            </button>
                            <button
                              type="button"
                              className="text-muted-foreground"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setConfirmDeleteId(message.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit(text);
        }}
      >
        {selectedFiles.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {selectedFiles.map((file) => (
              <li
                key={file.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
              >
                <span className="max-w-[10rem] truncate">{file.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => toggleFile(file)}
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {pickerOpen && canAttach ? (
          <div className="max-h-40 overflow-y-auto rounded-xl border border-border/60 bg-card p-2">
            {projectFiles.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No project files yet. Upload some in the Files tab first.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {projectFiles.map((file) => {
                  const checked = selectedFiles.some((item) => item.id === file.id);
                  return (
                    <li key={file.id}>
                      <button
                        type="button"
                        onClick={() => toggleFile(file)}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                          checked ? "bg-primary/10 text-primary" : "hover:bg-surface-low"
                        }`}
                      >
                        <span className="truncate font-medium">{file.name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatFileSize(file.size)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void submit(text);
            }
          }}
          rows={2}
          maxLength={4000}
          placeholder="Write a message"
          aria-label="Message"
          className="w-full resize-y rounded-xl border-0 bg-surface-low px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
        />
        <div className="flex flex-wrap items-center gap-3">
          {canAttach ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen((open) => !open)}
            >
              <Paperclip className="size-4" />
              Attach
            </Button>
          ) : null}
          <Button type="submit" disabled={sending || !canSend} className="rounded-xl px-4">
            {sending ? "Sending..." : "Send"}
          </Button>
          <p className="text-xs text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
          {actionError ? (
            <p role="alert" className="text-sm text-destructive">
              {actionError}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}

function Avatar({ author, name }: { author: ChatAuthor; name: string }) {
  const initial = name.slice(0, 1).toUpperCase();
  if (author.avatarUrl) {
    return (
      // Presigned avatar URLs change on every request, so the image optimizer cannot cache them.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={author.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
    );
  }
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
      {initial}
    </span>
  );
}

function formatTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

function withKnownAvatar(current: Row[], incoming: ClientMessage, self: ChatAuthor): ClientMessage {
  const existing = current.find((message) => message.id === incoming.id);
  const avatarUrl =
    incoming.author.avatarUrl ??
    existing?.author.avatarUrl ??
    (incoming.author.id === self.id ? self.avatarUrl : null);
  return {
    ...incoming,
    attachments: incoming.attachments ?? [],
    author: { ...incoming.author, avatarUrl },
  };
}

function prependOlder(current: Row[], olderNewestFirst: ClientMessage[]) {
  const chronological = [...olderNewestFirst].reverse();
  const ids = new Set(current.map((message) => message.id));
  return [...chronological.filter((message) => !message.id || !ids.has(message.id)), ...current];
}
