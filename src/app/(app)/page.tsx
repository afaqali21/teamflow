import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckSquare,
  FolderKanban,
  MessageSquare,
} from "lucide-react";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { TaskStatusControl } from "@/components/tasks/task-status-control";
import { countUnread } from "@/lib/inbox";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isTaskStatus, matchesDue, taskPriorityLabel, type TaskStatus } from "@/lib/task-filters";

type DashTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  project: { id: string; name: string };
};

type ActivityRow = {
  id: string;
  action: string;
  createdAt: Date;
  actor: { name: string | null; email: string } | null;
};

export default function Home() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading your dashboard...</p>
        </PageFrame>
      }
    >
      <DashboardPanel />
    </Suspense>
  );
}

async function DashboardPanel() {
  const actor = await requireUser();
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const projects: { id: string; name: string; description: string | null }[] = await db.project.findMany({
    where: { members: { some: { userId: actor.id } }, archivedAt: null },
    select: { id: true, name: true, description: true },
    orderBy: { name: "asc" },
  });
  const projectIds = projects.map((project) => project.id);
  const recentTaskIds =
    projectIds.length === 0
      ? []
      : (
          await db.task.findMany({
            where: { projectId: { in: projectIds } },
            select: { id: true },
            take: 100,
            orderBy: { updatedAt: "desc" },
          })
        ).map((task) => task.id);

  const [myTasks, openTaskCount, overdueCount, chatUnread, activity]: [
    DashTask[],
    number,
    number,
    number,
    ActivityRow[],
  ] = await Promise.all([
    projectIds.length === 0
      ? Promise.resolve([])
      : db.task.findMany({
          where: {
            assigneeId: actor.id,
            status: { not: "DONE" },
            projectId: { in: projectIds },
          },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            project: { select: { id: true, name: true } },
          },
          orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
          take: 8,
        }),
    projectIds.length === 0
      ? Promise.resolve(0)
      : db.task.count({
          where: { status: { not: "DONE" }, projectId: { in: projectIds } },
        }),
    projectIds.length === 0
      ? Promise.resolve(0)
      : db.task.count({
          where: {
            assigneeId: actor.id,
            status: { not: "DONE" },
            dueDate: { lt: start },
            projectId: { in: projectIds },
          },
        }),
    countUnread(actor.id),
    projectIds.length === 0
      ? Promise.resolve([])
      : db.activityLog.findMany({
          where: {
            OR: [
              { entityType: "Project", entityId: { in: projectIds } },
              ...(recentTaskIds.length > 0
                ? [{ entityType: "task", entityId: { in: recentTaskIds } }]
                : []),
            ],
          },
          orderBy: { createdAt: "desc" },
          take: 8,
          select: {
            id: true,
            action: true,
            createdAt: true,
            actor: { select: { name: true, email: true } },
          },
        }),
  ]);

  const firstName = actor.name?.trim().split(/\s+/)[0] || "there";
  const todayTasks = myTasks.filter((task) => matchesDue(task.dueDate, "today", now));
  const focusTasks = todayTasks.length > 0 ? todayTasks : myTasks.slice(0, 5);
  const forYou = myTasks.length;

  return (
    <PageFrame wide crumbs={[{ label: "Dashboard" }]}>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          <>
            Here&apos;s what is happening across your{" "}
            <span className="font-semibold text-foreground">{projects.length}</span> active{" "}
            {projects.length === 1 ? "project" : "projects"}.
          </>
        }
        actions={
          <div className="rounded-xl bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
            {formatDay(now)}
          </div>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active projects"
          value={String(projects.length)}
          detail={projects.length === 0 ? "Join or create a project" : "In your workspace"}
          icon={<FolderKanban className="size-5 text-primary" />}
          tone="primary"
        />
        <StatCard
          label="Open tasks"
          value={String(openTaskCount)}
          detail={`${forYou} assigned to you`}
          icon={<CheckSquare className="size-5 text-muted-foreground" />}
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          detail={overdueCount > 0 ? "Needs attention" : "You are caught up"}
          icon={<AlertTriangle className="size-5 text-destructive" />}
          tone={overdueCount > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Unread messages"
          value={String(chatUnread)}
          detail="Across your channels"
          icon={<MessageSquare className="size-5 text-primary" />}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <SurfaceCard>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold">My tasks</h2>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  {focusTasks.length} shown
                </span>
              </div>
              <Link href="/tasks" className="text-sm font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {focusTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open tasks assigned to you.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {focusTasks.map((task) => {
                  const status: TaskStatus = isTaskStatus(task.status) ? task.status : "TODO";
                  return (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border/70 bg-surface-low/60 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <Link
                          href={`/projects/${task.project.id}/tasks/${task.id}`}
                          className="font-medium text-foreground hover:underline"
                        >
                          {task.title}
                        </Link>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.project.name}
                          {task.priority in taskPriorityLabel
                            ? ` · ${taskPriorityLabel[task.priority as keyof typeof taskPriorityLabel]}`
                            : ""}
                          {task.dueDate ? ` · ${task.dueDate.toISOString().slice(0, 10)}` : ""}
                        </p>
                      </div>
                      <TaskStatusControl key={`${task.id}-${status}`} taskId={task.id} status={status} />
                    </li>
                  );
                })}
              </ul>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <h2 className="mb-4 text-lg font-semibold">Recent activity</h2>
            {activity.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent activity yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {activity.map((entry) => (
                  <li key={entry.id} className="flex gap-3 text-sm">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p>
                        <span className="font-medium">
                          {entry.actor?.name?.trim() || entry.actor?.email || "Someone"}
                        </span>{" "}
                        {entry.action}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <SurfaceCard>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Projects</h2>
              <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
                All
              </Link>
            </div>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">You are not in any projects yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {projects.slice(0, 6).map((project) => (
                  <li key={project.id}>
                    <Link
                      href={`/projects/${project.id}`}
                      className="block rounded-xl px-3 py-2.5 hover:bg-muted"
                    >
                      <span className="block font-medium">{project.name}</span>
                      {project.description ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {project.description}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </SurfaceCard>
          <SurfaceCard className="bg-muted">
            <h2 className="text-sm font-semibold">Quick links</h2>
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <Link href="/chat" className="font-medium text-primary hover:underline">
                Open chat
              </Link>
              <Link href="/tasks" className="font-medium text-primary hover:underline">
                My tasks
              </Link>
              <Link href="/files" className="font-medium text-primary hover:underline">
                Files
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    </PageFrame>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: "default" | "primary" | "danger";
}) {
  return (
    <SurfaceCard className="relative overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={`rounded-xl p-2 ${
            tone === "primary"
              ? "bg-[#e2dfff] text-primary"
              : tone === "danger"
                ? "bg-[#ffdad6] text-destructive"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`text-4xl font-semibold tracking-tight ${
          tone === "danger" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{detail}</p>
    </SurfaceCard>
  );
}

function formatDay(date: Date) {
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][
    date.getUTCDay()
  ];
  const month = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ][date.getUTCMonth()];
  return `${weekday}, ${month} ${date.getUTCDate()}`;
}
