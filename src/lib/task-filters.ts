export const taskStatuses = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof taskPriorities)[number];

export const dueFilters = ["all", "overdue", "today", "week", "none"] as const;
export type DueFilter = (typeof dueFilters)[number];

export const taskStatusLabel: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  REVIEW: "Review",
  DONE: "Done",
};

export const taskPriorityLabel: Record<TaskPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

export function isTaskStatus(value: string): value is TaskStatus {
  return taskStatuses.some((status) => status === value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return taskPriorities.some((priority) => priority === value);
}

export function isDueFilter(value: string): value is DueFilter {
  return dueFilters.some((filter) => filter === value);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

type DueRange = { none: true } | { gte?: Date; lt?: Date };

export function dueRange(filter: DueFilter, now: Date): DueRange | null {
  if (filter === "all") {
    return null;
  }
  if (filter === "none") {
    return { none: true };
  }
  const start = startOfUtcDay(now);
  const nextDay = new Date(start);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  if (filter === "overdue") {
    return { lt: start };
  }
  if (filter === "today") {
    return { gte: start, lt: nextDay };
  }
  const weekEnd = new Date(start);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
  return { gte: start, lt: weekEnd };
}

export function matchesDue(dueDate: Date | null, filter: DueFilter, now: Date): boolean {
  const range = dueRange(filter, now);
  if (!range) {
    return true;
  }
  if ("none" in range) {
    return dueDate === null;
  }
  if (!dueDate) {
    return false;
  }
  if (range.gte && dueDate < range.gte) {
    return false;
  }
  if (range.lt && dueDate >= range.lt) {
    return false;
  }
  return true;
}

export function taskBucket(dueDate: Date | null, now: Date): "overdue" | "today" | "week" | "later" {
  if (!dueDate) {
    return "later";
  }
  if (matchesDue(dueDate, "overdue", now)) {
    return "overdue";
  }
  if (matchesDue(dueDate, "today", now)) {
    return "today";
  }
  if (matchesDue(dueDate, "week", now)) {
    return "week";
  }
  return "later";
}
