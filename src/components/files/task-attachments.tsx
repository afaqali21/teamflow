"use client";

import { useActionState } from "react";
import { attachFileToTask, removeTaskAttachment } from "@/actions/attachments";
import { FilePreviewCard } from "@/components/files/file-preview";
import { Button } from "@/components/ui/button";

export type TaskAttachmentRow = {
  id: string;
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
  canRemove: boolean;
};

export function TaskAttachments({
  taskId,
  attachments,
  projectFiles,
  canAttach,
}: {
  taskId: string;
  attachments: TaskAttachmentRow[];
  projectFiles: { id: string; label: string }[];
  canAttach: boolean;
}) {
  const attachedIds = new Set(attachments.map((item) => item.fileId));
  const available = projectFiles.filter((file) => !attachedIds.has(file.id));
  const [attachError, attachAction, attachPending] = useActionState(attachFileToTask, null);

  return (
    <div className="flex flex-col gap-4">
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {attachments.map((item) => (
            <li key={item.id} className="flex flex-col gap-2">
              <FilePreviewCard
                file={{
                  fileId: item.fileId,
                  name: item.name,
                  mimeType: item.mimeType,
                  size: item.size,
                }}
              />
              {item.canRemove ? (
                <RemoveAttachmentForm attachmentId={item.id} />
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canAttach ? (
        available.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Upload a file in the project Files tab, then attach it here.
          </p>
        ) : (
          <form action={attachAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="taskId" value={taskId} />
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
              Attach a project file
              <select
                name="fileId"
                required
                defaultValue=""
                className="h-9 rounded-lg border-0 bg-surface-low px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
              >
                <option value="" disabled>
                  Choose a file
                </option>
                {available.map((file) => (
                  <option key={file.id} value={file.id}>
                    {file.label}
                  </option>
                ))}
              </select>
            </label>
            <Button type="submit" disabled={attachPending}>
              {attachPending ? "Attaching..." : "Attach"}
            </Button>
            {attachError ? (
              <p role="alert" className="basis-full text-sm text-destructive">
                {attachError}
              </p>
            ) : null}
          </form>
        )
      ) : null}
    </div>
  );
}

function RemoveAttachmentForm({ attachmentId }: { attachmentId: string }) {
  const [error, action, pending] = useActionState(removeTaskAttachment, null);
  return (
    <form action={action}>
      <input type="hidden" name="attachmentId" value={attachmentId} />
      <Button type="submit" variant="ghost" size="xs" disabled={pending}>
        {pending ? "Removing..." : "Remove"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
