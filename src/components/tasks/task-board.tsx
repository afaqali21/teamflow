"use client";

import { useState } from "react";
import Link from "next/link";
import { updateTaskStatus } from "@/actions/tasks";
import { taskPriorityLabel, taskStatusLabel, taskStatuses, type TaskPriority, type TaskStatus } from "@/lib/task-filters";

export type BoardTask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string;
  due: string;
  href: string;
  movable: boolean;
};

export function TaskBoard({ tasks }: { tasks: BoardTask[] }) {
  const [moved, setMoved] = useState<{ id: string; status: TaskStatus } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = moved && tasks.some((task) => task.id === moved.id && task.status !== moved.status) ? moved : null;

  function statusOf(task: BoardTask): TaskStatus {
    return pending?.id === task.id ? pending.status : task.status;
  }

  async function move(taskId: string, status: TaskStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task?.movable || statusOf(task) === status) {
      return;
    }
    setMoved({ id: taskId, status });
    setError(null);
    const result = await updateTaskStatus(taskId, status);
    if (result.error) {
      setMoved(null);
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <div className="grid min-w-[48rem] grid-cols-4 gap-3">
          {taskStatuses.map((status) => {
            const column = tasks.filter((task) => statusOf(task) === status);
            return (
              <section
                key={status}
                aria-label={taskStatusLabel[status]}
                className="flex min-h-48 flex-col gap-2 rounded-lg bg-muted/50 p-2"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void move(event.dataTransfer.getData("text/plain"), status);
                }}
              >
                <h3 className="px-1 text-sm font-medium">
                  {taskStatusLabel[status]}{" "}
                  <span className="font-normal text-muted-foreground">{column.length}</span>
                </h3>
                {column.length === 0 ? (
                  <p className="px-1 text-xs text-muted-foreground">No tasks</p>
                ) : (
                  column.map((task) => (
                    <article
                      key={task.id}
                      draggable={task.movable}
                      onDragStart={(event) => {
                        event.dataTransfer.setData("text/plain", task.id);
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      className={`rounded-lg border border-border bg-background p-3 text-sm ${
                        task.movable ? "cursor-grab" : ""
                      }`}
                    >
                      <Link href={task.href} className="font-medium underline">
                        {task.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {taskPriorityLabel[task.priority]} · {task.assignee}
                      </p>
                      <p className="text-xs text-muted-foreground">{task.due}</p>
                    </article>
                  ))
                )}
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
