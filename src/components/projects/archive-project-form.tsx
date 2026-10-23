"use client";

import { useActionState } from "react";
import { setProjectArchived, type ProjectFormState } from "@/actions/projects";
import { Button } from "@/components/ui/button";

const initialState: ProjectFormState = { error: null };

export function ArchiveProjectForm({
  projectId,
  archived,
}: {
  projectId: string;
  archived: boolean;
}) {
  const [state, action, pending] = useActionState(setProjectArchived, initialState);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="archived" value={archived ? "false" : "true"} />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Saving..." : archived ? "Restore" : "Archive"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
