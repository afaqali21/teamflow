export const MESSAGE_PAGE_SIZE = 30;

const CHANNEL_PREFIX = "private-channel-";

export function pusherChannelName(channelId: string) {
  return `${CHANNEL_PREFIX}${channelId}`;
}

export function channelIdFromPusherName(channelName: string) {
  if (!channelName.startsWith(CHANNEL_PREFIX)) {
    return null;
  }
  const channelId = channelName.slice(CHANNEL_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(channelId)) {
    return null;
  }
  return channelId;
}

export function sliceNewestPage<T extends { id: string }>(
  rows: T[],
  pageSize = MESSAGE_PAGE_SIZE,
) {
  const hasMore = rows.length > pageSize;
  const messages = hasMore ? rows.slice(0, pageSize) : rows;
  const oldest = messages.at(-1);
  return {
    messages,
    nextCursor: hasMore && oldest ? oldest.id : null,
  };
}
