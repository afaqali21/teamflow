export const PROJECT_FILE_MAX_BYTES = 25 * 1024 * 1024;

const mimeExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/zip": "zip",
} as const;

export type ProjectFileMimeType = keyof typeof mimeExtensions;

export function projectFileExtension(mimeType: string): string | null {
  if (mimeType in mimeExtensions) {
    return mimeExtensions[mimeType as ProjectFileMimeType];
  }
  return null;
}

export function validateProjectFileUpload(input: {
  name: string;
  size: number;
  mimeType: string;
}): string | null {
  const name = input.name.trim();
  if (!name) {
    return "Enter a file name.";
  }
  if (name.length > 200) {
    return "File names must be 200 characters or fewer.";
  }
  if (!Number.isInteger(input.size) || input.size < 1) {
    return "Choose a file to upload.";
  }
  if (input.size > PROJECT_FILE_MAX_BYTES) {
    return "Files must be 25 MB or smaller.";
  }
  if (!projectFileExtension(input.mimeType)) {
    return "That file type is not allowed.";
  }
  return null;
}

export function createProjectFileKey(
  projectId: string,
  fileId: string,
  mimeType: string,
): string | null {
  const extension = projectFileExtension(mimeType);
  if (
    !extension ||
    !/^[A-Za-z0-9_-]+$/.test(projectId) ||
    !/^[A-Za-z0-9_-]+$/.test(fileId)
  ) {
    return null;
  }
  return `projects/${projectId}/${fileId}.${extension}`;
}

export function isProjectFileKey(projectId: string, key: string): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(projectId)) {
    return false;
  }
  const prefix = `projects/${projectId}/`;
  if (!key.startsWith(prefix)) {
    return false;
  }
  return /^[A-Za-z0-9_-]+\.(jpg|png|webp|gif|pdf|txt|csv|doc|docx|xls|xlsx|ppt|pptx|zip)$/.test(
    key.slice(prefix.length),
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}
