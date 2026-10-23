"use client";

import { useActionState } from "react";
import { addTaskComment } from "@/actions/tasks";
import { Button } from "@/components/ui/button";

export function TaskCommentForm({ taskId }: { taskId: string }) {
  const [error, action, pending] = useActionState(addTaskComment, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="taskId" value={taskId} />
      <textarea
        name="body"
        required
        rows={3}
        maxLength={2000}
        aria-label="Comment"
        placeholder="Write a comment"
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Posting..." : "Post comment"}
        </Button>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
