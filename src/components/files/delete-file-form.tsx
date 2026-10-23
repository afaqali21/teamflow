"use client";

import { useActionState } from "react";
import { deleteProjectFile } from "@/actions/files";
import { Button } from "@/components/ui/button";

export function DeleteFileForm({ fileId, name }: { fileId: string; name: string }) {
  const [error, action, pending] = useActionState(deleteProjectFile, null);

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${name}”?`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="fileId" value={fileId} />
      <Button type="submit" variant="destructive" size="sm" disabled={pending}>
        {pending ? "Deleting..." : "Delete"}
      </Button>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
