"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { File as FileGlyph, Upload } from "lucide-react";
import { confirmUpload, requestDownload, requestUpload } from "@/actions/files";
import { DeleteFileForm } from "@/components/files/delete-file-form";
import { Button } from "@/components/ui/button";
import { formatFileSize, validateProjectFileUpload } from "@/lib/project-files";

export type ProjectFileRow = {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  uploaderLabel: string;
  canDelete: boolean;
};

type UploadJob = {
  localId: string;
  name: string;
  progress: number;
  error: string | null;
};

function putWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error("upload failed"));
    };
    xhr.onerror = () => reject(new Error("upload failed"));
    xhr.send(file);
  });
}

export function ProjectFiles({
  projectId,
  files,
  canUpload,
}: {
  projectId: string;
  files: ProjectFileRow[];
  canUpload: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const updateJob = useCallback((localId: string, patch: Partial<UploadJob>) => {
    setJobs((current) =>
      current.map((job) => (job.localId === localId ? { ...job, ...patch } : job)),
    );
  }, []);

  const removeJob = useCallback((localId: string) => {
    setJobs((current) => current.filter((job) => job.localId !== localId));
  }, []);

  async function uploadOne(file: File) {
    const localId = `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`;
    const localError = validateProjectFileUpload({
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
    });
    if (localError) {
      setJobs((current) => [
        ...current,
        { localId, name: file.name, progress: 0, error: localError },
      ]);
      return;
    }

    setJobs((current) => [...current, { localId, name: file.name, progress: 0, error: null }]);
    setListError(null);

    const ticket = await requestUpload({
      projectId,
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
    if (ticket.error || !ticket.uploadUrl || !ticket.fileId) {
      updateJob(localId, { error: ticket.error ?? "The upload could not start." });
      return;
    }

    try {
      await putWithProgress(ticket.uploadUrl, file, (progress) => {
        updateJob(localId, { progress });
      });
    } catch {
      updateJob(localId, { error: "The upload failed. Try again." });
      return;
    }

    const confirmed = await confirmUpload(ticket.fileId);
    if (confirmed.error) {
      updateJob(localId, { error: confirmed.error });
      return;
    }

    removeJob(localId);
    startTransition(() => {
      router.refresh();
    });
  }

  async function onFiles(selected: FileList | File[] | null) {
    if (!selected || !canUpload) {
      return;
    }
    const list = Array.from(selected);
    for (const file of list) {
      await uploadOne(file);
    }
  }

  async function onDownload(fileId: string) {
    setListError(null);
    const result = await requestDownload(fileId);
    if (result.error || !result.url) {
      setListError(result.error ?? "Download failed.");
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <div className="flex flex-col gap-5">
      {canUpload ? (
        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            if (event.currentTarget === event.target) {
              setDragOver(false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void onFiles(event.dataTransfer.files);
          }}
          className={`flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-surface-low/60"
          }`}
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e2dfff] text-primary">
            <Upload className="size-6" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">Drop files here</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Images, PDF, Office docs, text, CSV, or ZIP · up to 25 MB each
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => {
              void onFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button type="button" onClick={() => inputRef.current?.click()}>
            Choose files
          </Button>
        </div>
      ) : null}

      {jobs.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {jobs.map((job) => (
            <li key={job.localId} className="rounded-xl bg-surface-low px-4 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-medium">{job.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {job.error ? "Failed" : `${job.progress}%`}
                </span>
              </div>
              {job.error ? (
                <p role="alert" className="mt-1 text-xs text-destructive">
                  {job.error}
                </p>
              ) : (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-[width]"
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {listError ? (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      ) : null}

      {files.length === 0 && jobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl bg-surface-low/50 px-6 py-12 text-center">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e2dfff] text-primary">
            <FileGlyph className="size-6" />
          </span>
          <p className="text-sm text-muted-foreground">
            {canUpload
              ? "No files yet. Upload the first one above."
              : "No files in this project yet."}
          </p>
        </div>
      ) : files.length > 0 ? (
        <ul className="divide-y divide-border/60 rounded-2xl border border-border/60 bg-card">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{file.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatFileSize(file.size)} · {file.uploaderLabel} ·{" "}
                  {formatWhen(file.createdAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => void onDownload(file.id)}>
                  Download
                </Button>
                {file.canDelete ? <DeleteFileForm fileId={file.id} name={file.name} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function formatWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}
