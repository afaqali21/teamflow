export type ChatAuthor = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

export type ClientAttachment = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
};

export type ClientMessage = {
  id: string;
  body: string;
  createdAt: string;
  author: ChatAuthor;
  attachments: ClientAttachment[];
};

export function upsertMessage(messages: ClientMessage[], incoming: ClientMessage) {
  const index = messages.findIndex((message) => message.id === incoming.id);
  if (index === -1) {
    return [...messages, incoming];
  }
  const next = messages.slice();
  next[index] = incoming;
  return next;
}

export function removeMessage(messages: ClientMessage[], id: string) {
  return messages.filter((message) => message.id !== id);
}

function readAttachment(value: unknown): ClientAttachment | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.fileId !== "string" ||
    typeof record.name !== "string" ||
    typeof record.mimeType !== "string" ||
    typeof record.size !== "number"
  ) {
    return null;
  }
  return {
    id: record.id,
    fileId: record.fileId,
    name: record.name,
    mimeType: record.mimeType,
    size: record.size,
  };
}

export function readLiveMessage(value: unknown): ClientMessage | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as Record<string, unknown>;
  const author = record.author;
  if (!author || typeof author !== "object") {
    return null;
  }
  const person = author as Record<string, unknown>;
  if (
    typeof record.id !== "string" ||
    typeof record.body !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof person.id !== "string" ||
    typeof person.email !== "string"
  ) {
    return null;
  }
  const attachments = Array.isArray(record.attachments)
    ? record.attachments.map(readAttachment).filter((item): item is ClientAttachment => item !== null)
    : [];
  return {
    id: record.id,
    body: record.body,
    createdAt: record.createdAt,
    attachments,
    author: {
      id: person.id,
      name: typeof person.name === "string" ? person.name : null,
      email: person.email,
      avatarUrl: typeof person.avatarUrl === "string" ? person.avatarUrl : null,
    },
  };
}

export function readDeletedMessageId(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}
