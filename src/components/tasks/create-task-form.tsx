"use client";

import { useActionState } from "react";
import { createTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { taskPriorityLabel, taskPriorities, taskStatusLabel, taskStatuses } from "@/lib/task-filters";

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CreateTaskForm({
  projectId,
  people,
}: {
  projectId: string;
  people: { id: string; label: string }[];
}) {
  const [error, action, pending] = useActionState(createTask, null);

  return (
    <form action={action} className="grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Title
        <input name="title" required maxLength={120} className={fieldClassName} />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Description
        <textarea name="description" rows={3} maxLength={4000} className={`${fieldClassName} h-auto py-2`} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Status
        <select name="status" defaultValue="TODO" className={fieldClassName}>
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {taskStatusLabel[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Priority
        <select name="priority" defaultValue="MEDIUM" className={fieldClassName}>
          {taskPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {taskPriorityLabel[priority]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Assignee
        <select name="assigneeId" defaultValue="" className={fieldClassName}>
          <option value="">Unassigned</option>
          {people.map((person) => (
            <option key={person.id} value={person.id}>
              {person.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Due date
        <input name="dueDate" type="date" className={fieldClassName} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create task"}
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
