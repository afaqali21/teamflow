export function directChannelKey(leftId: string, rightId: string): string | null {
  if (!leftId || !rightId || leftId === rightId) {
    return null;
  }
  const [first, second] = [leftId, rightId].sort();
  return `${first}:${second}`;
}

export function isUnreadMessage(
  message: { authorId: string; createdAt: Date; deletedAt: Date | null },
  viewerId: string,
  lastReadAt: Date | null,
): boolean {
  if (message.deletedAt || message.authorId === viewerId) {
    return false;
  }
  if (!lastReadAt) {
    return true;
  }
  return message.createdAt > lastReadAt;
}
