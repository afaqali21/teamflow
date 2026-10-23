"use client";

import { useEffect, useState } from "react";
import { File as FileGlyph, X } from "lucide-react";
import { requestDownload, requestPreview } from "@/actions/files";
import { Button } from "@/components/ui/button";
import { isImageMime, isPdfMime, isPreviewableMime } from "@/lib/attachments";
import { formatFileSize } from "@/lib/project-files";

export type PreviewFile = {
  fileId: string;
  name: string;
  mimeType: string;
  size: number;
};

export function FilePreviewCard({
  file,
  compact,
}: {
  file: PreviewFile;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const previewable = isPreviewableMime(file.mimeType);

  useEffect(() => {
    if (!open || !previewable) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void requestPreview(file.fileId).then((result) => {
      if (cancelled) {
        return;
      }
      setLoading(false);
      if (result.error || !result.url) {
        setError(result.error ?? "Preview unavailable.");
        setUrl(null);
        return;
      }
      setUrl(result.url);
    });
    return () => {
      cancelled = true;
    };
  }, [open, previewable, file.fileId]);

  async function onDownload() {
    setError(null);
    const result = await requestDownload(file.fileId);
    if (result.error || !result.url) {
      setError(result.error ?? "Download failed.");
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <>
      <div
        className={`overflow-hidden rounded-xl border border-border/60 bg-card text-left ${
          compact ? "max-w-[14rem]" : "w-full max-w-sm"
        }`}
      >
        {isImageMime(file.mimeType) && open && url ? (
          // Presigned URLs change; skip the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.name} className="max-h-40 w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => (previewable ? setOpen(true) : void onDownload())}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-surface-low"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#e2dfff] text-primary">
              <FileGlyph className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">{file.name}</span>
              <span className="block text-[11px] text-muted-foreground">
                {formatFileSize(file.size)}
                {previewable ? " · Preview" : " · Download"}
              </span>
            </span>
          </button>
        )}
        <div className="flex gap-2 border-t border-border/50 px-2 py-1.5">
          {previewable ? (
            <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(true)}>
              Preview
            </Button>
          ) : null}
          <Button type="button" size="xs" variant="ghost" onClick={() => void onDownload()}>
            Download
          </Button>
        </div>
        {error ? (
          <p role="alert" className="px-3 pb-2 text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={file.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-card shadow-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <p className="truncate text-sm font-semibold">{file.name}</p>
              <Button type="button" size="icon-sm" variant="ghost" onClick={() => setOpen(false)}>
                <X className="size-4" />
              </Button>
            </div>
            <div className="min-h-[12rem] flex-1 overflow-auto bg-surface-low p-4">
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading preview...</p>
              ) : error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : url && isImageMime(file.mimeType) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={file.name} className="mx-auto max-h-[70vh] max-w-full object-contain" />
              ) : url && isPdfMime(file.mimeType) ? (
                <iframe title={file.name} src={url} className="h-[70vh] w-full rounded-lg bg-card" />
              ) : (
                <p className="text-sm text-muted-foreground">Preview unavailable.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
