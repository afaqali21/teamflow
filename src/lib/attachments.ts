export const MAX_MESSAGE_ATTACHMENTS = 5;

export function isImageMime(mimeType: string): boolean {
  return (
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  );
}

export function isPdfMime(mimeType: string): boolean {
  return mimeType === "application/pdf";
}

export function isPreviewableMime(mimeType: string): boolean {
  return isImageMime(mimeType) || isPdfMime(mimeType);
}

export function validateAttachmentIds(fileIds: string[]): string | null {
  if (fileIds.length > MAX_MESSAGE_ATTACHMENTS) {
    return `Attach up to ${MAX_MESSAGE_ATTACHMENTS} files.`;
  }
  const unique = new Set(fileIds);
  if (unique.size !== fileIds.length) {
    return "Remove duplicate attachments.";
  }
  return null;
}

export function canSendMessagePayload(body: string, fileIds: string[]): boolean {
  return body.trim().length > 0 || fileIds.length > 0;
}
