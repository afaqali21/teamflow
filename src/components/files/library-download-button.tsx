"use client";

import { useState } from "react";
import { requestDownload } from "@/actions/files";
import { Button } from "@/components/ui/button";

export function LibraryDownloadButton({ fileId }: { fileId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onDownload() {
    setPending(true);
    setError(null);
    const result = await requestDownload(fileId);
    setPending(false);
    if (result.error || !result.url) {
      setError(result.error ?? "Download failed.");
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => void onDownload()}>
        {pending ? "Preparing..." : "Download"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
