const USER_PREFIX = "private-user-";

export function userChannelName(userId: string) {
  return `${USER_PREFIX}${userId}`;
}

export function userIdFromPusherName(channelName: string) {
  if (!channelName.startsWith(USER_PREFIX)) {
    return null;
  }
  const userId = channelName.slice(USER_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(userId)) {
    return null;
  }
  return userId;
}
