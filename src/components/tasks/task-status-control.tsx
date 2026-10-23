"use client";

import { useState } from "react";
import { updateTaskStatus } from "@/actions/tasks";
import { isTaskStatus, taskStatusLabel, taskStatuses, type TaskStatus } from "@/lib/task-filters";

const fieldClassName =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function TaskStatusControl({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <select
        aria-label="Status"
        value={current}
        className={fieldClassName}
        onChange={(event) => {
          const next = event.target.value;
          if (!isTaskStatus(next) || next === current) {
            return;
          }
          const previous = current;
          setCurrent(next);
          void updateTaskStatus(taskId, next).then((result) => {
            if (result.error) {
              setCurrent(previous);
              setError(result.error);
              return;
            }
            setError(null);
          });
        }}
      >
        {taskStatuses.map((item) => (
          <option key={item} value={item}>
            {taskStatusLabel[item]}
          </option>
        ))}
      </select>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
