export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

const mimeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type AvatarMimeType = keyof typeof mimeExtensions;

export function avatarExtension(mimeType: string): string | null {
  if (mimeType in mimeExtensions) {
    return mimeExtensions[mimeType as AvatarMimeType];
  }
  return null;
}

export function validateAvatarUpload(input: { size: number; mimeType: string }): string | null {
  if (!Number.isInteger(input.size) || input.size < 1) {
    return "Choose an image to upload.";
  }
  if (input.size > AVATAR_MAX_BYTES) {
    return "Images must be 2 MB or smaller.";
  }
  if (!avatarExtension(input.mimeType)) {
    return "Use a JPEG, PNG, WebP, or GIF.";
  }
  return null;
}

export function createAvatarKey(userId: string, mimeType: string, id: string): string | null {
  const extension = avatarExtension(mimeType);
  if (!extension || !/^[A-Za-z0-9_-]+$/.test(userId) || !/^[A-Za-z0-9_-]{16,}$/.test(id)) {
    return null;
  }
  return `avatars/${userId}/${id}.${extension}`;
}

export function isOwnAvatarKey(userId: string, key: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(userId)) {
    return false;
  }
  const prefix = `avatars/${userId}/`;
  if (!key.startsWith(prefix)) {
    return false;
  }
  return /^[A-Za-z0-9_-]{16,}\.(jpg|png|webp|gif)$/.test(key.slice(prefix.length));
}
