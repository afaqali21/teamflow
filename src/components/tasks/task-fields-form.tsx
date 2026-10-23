"use client";

import { useActionState } from "react";
import { saveTask } from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { taskPriorityLabel, taskPriorities, type TaskPriority } from "@/lib/task-filters";

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TaskFieldsForm({
  taskId,
  title,
  description,
  priority,
  assigneeId,
  dueDate,
  people,
}: {
  taskId: string;
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  people: { id: string; label: string }[];
}) {
  const [error, action, pending] = useActionState(saveTask, null);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="taskId" value={taskId} />
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Title
        <input name="title" required maxLength={120} defaultValue={title} className={fieldClassName} />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Description
        <textarea
          name="description"
          rows={4}
          maxLength={4000}
          defaultValue={description}
          className={`${fieldClassName} h-auto py-2`}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Priority
        <select name="priority" defaultValue={priority} className={fieldClassName}>
          {taskPriorities.map((item) => (
            <option key={item} value={item}>
              {taskPriorityLabel[item]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Assignee
        <select name="assigneeId" defaultValue={assigneeId} className={fieldClassName}>
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
        <input name="dueDate" type="date" defaultValue={dueDate} className={fieldClassName} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
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
