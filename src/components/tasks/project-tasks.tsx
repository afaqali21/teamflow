import Link from "next/link";
import type { ReactNode } from "react";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { TaskBoard, type BoardTask } from "@/components/tasks/task-board";
import { TaskStatusControl } from "@/components/tasks/task-status-control";
import { db } from "@/lib/db";
import { can, type Actor } from "@/lib/permissions";
import type { ProjectMemberRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import {
  dueRange,
  isDueFilter,
  isTaskPriority,
  isTaskStatus,
  taskPriorityLabel,
  taskStatusLabel,
  taskStatuses,
  type DueFilter,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/task-filters";

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  assignee: { id: string; name: string | null; email: string } | null;
};

export async function ProjectTasks({
  projectId,
  members,
  status,
  assignee,
  due,
  view,
}: {
  projectId: string;
  members: { id: string; label: string; isActive: boolean; role: ProjectMemberRole }[];
  status?: string;
  assignee?: string;
  due?: string;
  view?: string;
}) {
  const actor = await requireUser();
  const membership = members.find((member) => member.id === actor.id) ?? null;
  const role = membership?.role ?? null;
  const statusFilter = status && isTaskStatus(status) ? status : null;
  const dueFilter: DueFilter = due && isDueFilter(due) ? due : "all";
  let assigneeFilter: string | null = null;
  if (assignee === "unassigned" || (assignee !== undefined && members.some((member) => member.id === assignee))) {
    assigneeFilter = assignee;
  }
  const board = view === "board";

  const tasks: TaskRow[] = await db.task.findMany({
    where: {
      projectId,
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(assigneeFilter === "unassigned"
        ? { assigneeId: null }
        : assigneeFilter
          ? { assigneeId: assigneeFilter }
          : {}),
      ...dueClause(dueFilter, new Date()),
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      assignee: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });

  const canCreate = can(actor, "task.create", { type: "task", memberRole: role, assigneeId: null });
  const filtersActive = Boolean(statusFilter || assigneeFilter || dueFilter !== "all");
  const href = (nextView: "list" | "board") =>
    taskHref(projectId, {
      view: nextView,
      status: statusFilter,
      assignee: assigneeFilter,
      due: dueFilter,
    });

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Tasks</h2>
        <div className="flex gap-1 rounded-xl bg-muted p-1 text-sm">
          <Link
            href={href("list")}
            aria-current={board ? undefined : "page"}
            className={`rounded-lg px-3 py-1.5 ${board ? "text-muted-foreground" : "bg-card font-medium text-primary shadow-sm"}`}
          >
            List
          </Link>
          <Link
            href={href("board")}
            aria-current={board ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 ${board ? "bg-card font-medium text-primary shadow-sm" : "text-muted-foreground"}`}
          >
            Board
          </Link>
        </div>
      </div>
      <form method="get" className="flex flex-wrap items-end gap-2 rounded-2xl bg-card p-4 shadow-sm">
        <input type="hidden" name="tab" value="tasks" />
        {board ? <input type="hidden" name="view" value="board" /> : null}
        <Filter label="Status" name="status" defaultValue={statusFilter ?? ""}>
          <option value="">All statuses</option>
          {taskStatuses.map((item) => (
            <option key={item} value={item}>
              {taskStatusLabel[item]}
            </option>
          ))}
        </Filter>
        <Filter label="Assignee" name="assignee" defaultValue={assigneeFilter ?? ""}>
          <option value="">Everyone</option>
          <option value="unassigned">Unassigned</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.label}
            </option>
          ))}
        </Filter>
        <Filter label="Due date" name="due" defaultValue={dueFilter}>
          <option value="all">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="none">No due date</option>
        </Filter>
        <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
          Apply
        </button>
      </form>
      {canCreate ? (
        <CreateTaskForm
          projectId={projectId}
          people={members.filter((member) => member.isActive).map((member) => ({
            id: member.id,
            label: member.label,
          }))}
        />
      ) : null}
      {tasks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {filtersActive ? "No tasks match these filters." : "No tasks yet."}
        </p>
      ) : board ? (
        <TaskBoard tasks={tasks.map((task) => toBoardTask(task, actor, role, projectId))} />
      ) : (
        <ul className="flex flex-col gap-3">
          {tasks.map((task) => {
            const currentStatus = isTaskStatus(task.status) ? task.status : "TODO";
            const currentPriority = isTaskPriority(task.priority) ? task.priority : "MEDIUM";
            const movable = can(actor, "task.updateStatus", {
              type: "task",
              memberRole: role,
              assigneeId: task.assignee?.id ?? null,
            });
            return (
              <li key={task.id} className="rounded-2xl bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link href={`/projects/${projectId}/tasks/${task.id}`} className="font-medium text-foreground hover:underline">
                      {task.title}
                    </Link>
                    {task.description ? (
                      <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted-foreground">
                      {taskPriorityLabel[currentPriority]} · {personLabel(task.assignee)} · {formatDue(task.dueDate)}
                    </p>
                  </div>
                  {movable ? (
                    <TaskStatusControl key={`${task.id}-${currentStatus}`} taskId={task.id} status={currentStatus} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{taskStatusLabel[currentStatus]}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function Filter({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <select
        name={name}
        defaultValue={defaultValue}
        className="h-9 rounded-lg border-0 bg-surface-low px-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
      >
        {children}
      </select>
    </label>
  );
}

function toBoardTask(
  task: TaskRow,
  actor: Actor,
  role: ProjectMemberRole | null,
  projectId: string,
): BoardTask {
  const status: TaskStatus = isTaskStatus(task.status) ? task.status : "TODO";
  const priority: TaskPriority = isTaskPriority(task.priority) ? task.priority : "MEDIUM";
  return {
    id: task.id,
    title: task.title,
    status,
    priority,
    assignee: personLabel(task.assignee),
    due: formatDue(task.dueDate),
    href: `/projects/${projectId}/tasks/${task.id}`,
    movable: can(actor, "task.updateStatus", {
      type: "task",
      memberRole: role,
      assigneeId: task.assignee?.id ?? null,
    }),
  };
}

function personLabel(person: { name: string | null; email: string } | null) {
  if (!person) {
    return "Unassigned";
  }
  return person.name?.trim() || person.email;
}

function formatDue(date: Date | null) {
  if (!date) {
    return "No due date";
  }
  return date.toISOString().slice(0, 10);
}

function dueClause(filter: DueFilter, now: Date) {
  const range = dueRange(filter, now);
  if (!range) {
    return {};
  }
  if ("none" in range) {
    return { dueDate: null };
  }
  return {
    dueDate: {
      ...(range.gte ? { gte: range.gte } : {}),
      ...(range.lt ? { lt: range.lt } : {}),
    },
  };
}

function taskHref(
  projectId: string,
  query: { view: "list" | "board"; status: string | null; assignee: string | null; due: DueFilter },
) {
  const params = new URLSearchParams({ tab: "tasks" });
  if (query.view === "board") {
    params.set("view", "board");
  }
  if (query.status) {
    params.set("status", query.status);
  }
  if (query.assignee) {
    params.set("assignee", query.assignee);
  }
  if (query.due !== "all") {
    params.set("due", query.due);
  }
  return `/projects/${projectId}?${params.toString()}`;
}
