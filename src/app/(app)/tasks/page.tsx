import { Suspense } from "react";
import Link from "next/link";
import { TaskStatusControl } from "@/components/tasks/task-status-control";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isTaskStatus, taskBucket, type TaskStatus } from "@/lib/task-filters";

const groups = [
  { id: "overdue", label: "Overdue", tone: "danger" },
  { id: "today", label: "Today", tone: "primary" },
  { id: "week", label: "This week", tone: "default" },
  { id: "later", label: "Later", tone: "default" },
] as const;

type AssignedTask = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | null;
  project: { id: string; name: string };
};

export default function MyTasksPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading your tasks...</p>
        </PageFrame>
      }
    >
      <MyTasksPanel />
    </Suspense>
  );
}

async function MyTasksPanel() {
  const actor = await requireUser();
  const tasks: AssignedTask[] = await db.task.findMany({
    where: {
      assigneeId: actor.id,
      project: { members: { some: { userId: actor.id } } },
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueDate: true,
      project: { select: { id: true, name: true } },
    },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
  const now = new Date();

  return (
    <PageFrame crumbs={[{ label: "Dashboard", href: "/" }, { label: "My Tasks" }]}>
      <PageHeader
        title="My Tasks"
        description="Tasks assigned to you, grouped by due date."
        actions={
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {tasks.length} total
          </span>
        }
      />
      {tasks.length === 0 ? (
        <SurfaceCard>
          <p className="text-sm text-muted-foreground">No tasks are assigned to you.</p>
        </SurfaceCard>
      ) : (
        groups.map((group) => {
          const items = tasks.filter((task) => taskBucket(task.dueDate, now) === group.id);
          return (
            <SurfaceCard key={group.id}>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-lg font-semibold">{group.label}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    group.tone === "danger"
                      ? "bg-[#ffdad6] text-destructive"
                      : group.tone === "primary"
                        ? "bg-[#e2dfff] text-primary"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {items.length}
                </span>
              </div>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">None</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {items.map((task) => {
                    const status: TaskStatus = isTaskStatus(task.status) ? task.status : "TODO";
                    return (
                      <li
                        key={task.id}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-low/50 px-4 py-3"
                      >
                        <div>
                          <Link
                            href={`/projects/${task.project.id}/tasks/${task.id}`}
                            className="font-medium text-foreground hover:underline"
                          >
                            {task.title}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {task.project.name} ·{" "}
                            {task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "No due date"}
                          </p>
                        </div>
                        <TaskStatusControl key={`${task.id}-${status}`} taskId={task.id} status={status} />
                      </li>
                    );
                  })}
                </ul>
              )}
            </SurfaceCard>
          );
        })
      )}
    </PageFrame>
  );
}
