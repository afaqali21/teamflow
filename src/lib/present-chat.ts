import type { ClientMessage } from "@/lib/chat-message";
import { displayAvatar } from "@/lib/display-avatar";
import type { ChatMessage } from "@/lib/messages";

export async function presentMessage(message: ChatMessage): Promise<ClientMessage> {
  return {
    id: message.id,
    body: message.body,
    createdAt: message.createdAt.toISOString(),
    attachments: message.attachments,
    author: {
      id: message.author.id,
      name: message.author.name,
      email: message.author.email,
      avatarUrl: await displayAvatar(message.author.id, message.author.image),
    },
  };
}

export async function presentMessages(messages: ChatMessage[]) {
  return Promise.all(messages.map((message) => presentMessage(message)));
}
