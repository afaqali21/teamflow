import { db } from "@/lib/db";
import { formatFileSize } from "@/lib/project-files";
import { taskStatuses, type TaskStatus } from "@/lib/task-filters";

export type AdminStats = {
  usersByRole: { ADMIN: number; MANAGER: number; EMPLOYEE: number; total: number; inactive: number };
  activeProjects: number;
  archivedProjects: number;
  tasksByStatus: Record<TaskStatus, number>;
  overdueTasks: number;
  storageBytes: number;
  storageLabel: string;
  recentActivity: {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
    actorLabel: string;
  }[];
};

export async function getAdminStats(): Promise<AdminStats> {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const [
    roleGroups,
    inactiveUsers,
    activeProjects,
    archivedProjects,
    statusGroups,
    overdueTasks,
    storage,
    activity,
  ] = await Promise.all([
    db.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    }),
    db.user.count({ where: { isActive: false } }),
    db.project.count({ where: { archivedAt: null } }),
    db.project.count({ where: { archivedAt: { not: null } } }),
    db.task.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    db.task.count({
      where: {
        status: { not: "DONE" },
        dueDate: { lt: startOfToday },
      },
    }),
    db.file.aggregate({
      where: { status: "READY" },
      _sum: { size: true },
    }),
    db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actor: { select: { name: true, email: true } },
      },
    }),
  ]);

  const usersByRole = { ADMIN: 0, MANAGER: 0, EMPLOYEE: 0, total: 0, inactive: inactiveUsers };
  for (const row of roleGroups) {
    if (row.role === "ADMIN" || row.role === "MANAGER" || row.role === "EMPLOYEE") {
      usersByRole[row.role] = row._count._all;
      usersByRole.total += row._count._all;
    }
  }

  const tasksByStatus = Object.fromEntries(taskStatuses.map((status) => [status, 0])) as Record<
    TaskStatus,
    number
  >;
  for (const row of statusGroups) {
    if (row.status in tasksByStatus) {
      tasksByStatus[row.status as TaskStatus] = row._count._all;
    }
  }

  const storageBytes = storage._sum.size ?? 0;

  return {
    usersByRole,
    activeProjects,
    archivedProjects,
    tasksByStatus,
    overdueTasks,
    storageBytes,
    storageLabel: formatFileSize(storageBytes),
    recentActivity: activity.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      createdAt: entry.createdAt,
      actorLabel: entry.actor?.name?.trim() || entry.actor?.email || "Someone",
    })),
  };
}
