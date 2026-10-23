export type ShellNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export function readLiveNotification(value: unknown): ShellNotification | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.title !== "string" || typeof record.createdAt !== "string") {
    return null;
  }
  if (record.body !== null && typeof record.body !== "string") {
    return null;
  }
  if (record.link !== null && typeof record.link !== "string") {
    return null;
  }
  return {
    id: record.id,
    title: record.title,
    body: typeof record.body === "string" ? record.body : null,
    link: typeof record.link === "string" ? record.link : null,
    readAt: null,
    createdAt: record.createdAt,
  };
}
