"use client";

import { useActionState } from "react";
import { deleteTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";

export function DeleteTaskForm({ taskId, title }: { taskId: string; title: string }) {
  const [error, action, pending] = useActionState(deleteTask, null);

  return (
    <form
      action={action}
      className="flex flex-wrap items-center gap-3"
      onSubmit={(event) => {
        if (!window.confirm(`Delete “${title}”? This cannot be undone.`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="taskId" value={taskId} />
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Deleting..." : "Delete task"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
