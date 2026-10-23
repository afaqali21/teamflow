import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckSquare,
  FolderKanban,
  HardDrive,
  Users,
} from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { getAdminStats } from "@/lib/admin-stats";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { taskStatusLabel, taskStatuses } from "@/lib/task-filters";

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading admin dashboard...</p>
        </PageFrame>
      }
    >
      <AdminDashboardPanel />
    </Suspense>
  );
}

async function AdminDashboardPanel() {
  const actor = await requireUser();
  if (!can(actor, "users.list")) {
    return (
      <PageFrame>
        <SurfaceCard className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to view the admin dashboard.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            Back home
          </Link>
        </SurfaceCard>
      </PageFrame>
    );
  }

  const stats = await getAdminStats();
  const taskTotal = taskStatuses.reduce((sum, status) => sum + stats.tasksByStatus[status], 0);

  return (
    <PageFrame
      wide
      crumbs={[{ label: "Dashboard", href: "/" }, { label: "Admin" }]}
    >
      <PageHeader
        eyebrow="Admin"
        title="Workspace overview"
        description="Users, projects, tasks, storage, and recent activity across Teamflow."
      />
      <AdminNav pathname="/admin" />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SurfaceCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Users by role
            </p>
            <span className="rounded-lg bg-muted p-1.5 text-primary">
              <Users className="size-4" />
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight">{stats.usersByRole.total}</p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="flex h-full w-full">
              <RoleBar count={stats.usersByRole.ADMIN} total={stats.usersByRole.total} className="bg-[#5c00ca]" />
              <RoleBar count={stats.usersByRole.MANAGER} total={stats.usersByRole.total} className="bg-primary" />
              <RoleBar count={stats.usersByRole.EMPLOYEE} total={stats.usersByRole.total} className="bg-secondary" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Admin {stats.usersByRole.ADMIN} · Manager {stats.usersByRole.MANAGER} · Employee{" "}
            {stats.usersByRole.EMPLOYEE}
            {stats.usersByRole.inactive > 0 ? ` · ${stats.usersByRole.inactive} inactive` : ""}
          </p>
          <Link href="/admin/users" className="text-sm font-medium text-primary hover:underline">
            Manage users
          </Link>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Active projects
            </p>
            <span className="rounded-lg bg-muted p-1.5 text-secondary">
              <FolderKanban className="size-4" />
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight">{stats.activeProjects}</p>
          <p className="text-sm text-muted-foreground">
            {stats.archivedProjects} archived
          </p>
          <Link href="/projects" className="mt-auto text-sm font-medium text-primary hover:underline">
            View projects
          </Link>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Tasks by status
            </p>
            <span className="rounded-lg bg-muted p-1.5 text-primary">
              <CheckSquare className="size-4" />
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight">{taskTotal}</p>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="flex h-full w-full">
              {taskStatuses.map((status) => (
                <RoleBar
                  key={status}
                  count={stats.tasksByStatus[status]}
                  total={taskTotal}
                  className={statusTone(status)}
                />
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground sm:grid-cols-4">
            {taskStatuses.map((status) => (
              <div key={status}>
                <span className="block font-semibold text-foreground">
                  {stats.tasksByStatus[status]}
                </span>
                {taskStatusLabel[status]}
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Storage used
            </p>
            <span className="rounded-lg bg-muted p-1.5 text-primary">
              <HardDrive className="size-4" />
            </span>
          </div>
          <p className="text-3xl font-semibold tracking-tight">{stats.storageLabel}</p>
          <p className="text-sm text-muted-foreground">Ready project files in R2</p>
          <div className="mt-auto flex items-center gap-2 text-sm">
            <AlertTriangle
              className={`size-4 ${stats.overdueTasks > 0 ? "text-destructive" : "text-muted-foreground"}`}
            />
            <span className={stats.overdueTasks > 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
              {stats.overdueTasks} overdue {stats.overdueTasks === 1 ? "task" : "tasks"}
            </span>
          </div>
        </SurfaceCard>
      </section>

      <SurfaceCard className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            Last {stats.recentActivity.length}
          </span>
        </div>
        {stats.recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity logged yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {stats.recentActivity.map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-sm">
                <p>
                  <span className="font-medium">{entry.actorLabel}</span> {entry.action}{" "}
                  <span className="text-muted-foreground">
                    ({entry.entityType} · {entry.entityId.slice(0, 8)})
                  </span>
                </p>
                <time dateTime={entry.createdAt.toISOString()} className="text-xs text-muted-foreground">
                  {entry.createdAt.toISOString().slice(0, 16).replace("T", " ")} UTC
                </time>
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>
    </PageFrame>
  );
}

function RoleBar({
  count,
  total,
  className,
}: {
  count: number;
  total: number;
  className: string;
}) {
  if (total <= 0 || count <= 0) {
    return null;
  }
  return <div className={`h-full ${className}`} style={{ width: `${(count / total) * 100}%` }} />;
}

function statusTone(status: string) {
  switch (status) {
    case "TODO":
      return "bg-outline";
    case "IN_PROGRESS":
      return "bg-primary";
    case "REVIEW":
      return "bg-[#7531e6]";
    case "DONE":
      return "bg-secondary";
    default:
      return "bg-muted-foreground";
  }
}
