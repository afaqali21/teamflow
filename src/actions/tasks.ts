"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { notifyUsers } from "@/lib/notifications";
import { can } from "@/lib/permissions";
import type { ProjectMemberRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";
import { isTaskStatus, taskPriorities, taskPriorityLabel, taskStatusLabel, taskStatuses } from "@/lib/task-filters";

const createSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  assigneeId: z.string(),
  dueDate: z.string(),
});

const saveSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(4000),
  priority: z.enum(taskPriorities),
  assigneeId: z.string(),
  dueDate: z.string(),
});

const commentSchema = z.object({
  taskId: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
});

function memberRole(role: string | null | undefined): ProjectMemberRole | null {
  return role === "OWNER" || role === "MEMBER" ? role : null;
}

async function actorMembership(actorId: string, projectId: string) {
  const member: { role: string } | null = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actorId } },
    select: { role: true },
  });
  return memberRole(member?.role);
}

function taskPath(projectId: string, taskId: string) {
  return `/projects/${projectId}/tasks/${taskId}`;
}

function assignmentEmail(
  actor: { name: string | null; email: string },
  title: string,
  link: string,
) {
  const who = actor.name?.trim() || actor.email;
  return {
    subject: "You were assigned a task",
    text: `${who} assigned you "${title}".\n\n${(process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")}${link}\n`,
  };
}

function refreshTask(projectId: string, taskId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
  revalidatePath("/tasks");
}

async function logTask(actorId: string, taskId: string, action: string) {
  await db.activityLog.create({
    data: { actorId, action, entityType: "task", entityId: taskId },
  });
}

function parseDueDate(value: string): { error: string } | { date: Date | null } {
  const trimmed = value.trim();
  if (!trimmed) {
    return { date: null };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { error: "Enter a valid due date." };
  }
  const date = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return { error: "Enter a valid due date." };
  }
  return { date };
}

export async function createTask(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const parsed = createSchema.safeParse({
    projectId: formData.get("projectId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    status: formData.get("status"),
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) {
    return "Enter a title and choose a status and priority.";
  }

  const role = await actorMembership(actor.id, parsed.data.projectId);
  const resource = { type: "task" as const, memberRole: role, assigneeId: null };
  if (!can(actor, "task.create", resource)) {
    return "You cannot create tasks in this project.";
  }

  const assigneeId = parsed.data.assigneeId.trim();
  if (assigneeId) {
    if (!can(actor, "task.assign", resource)) {
      return "You cannot assign tasks in this project.";
    }
    const assignee: { user: { isActive: boolean } } | null = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: parsed.data.projectId, userId: assigneeId } },
      select: { user: { select: { isActive: true } } },
    });
    if (!assignee?.user.isActive) {
      return "Assign the task to an active project member.";
    }
  }

  let dueDate: Date | null = null;
  const parsedDue = parseDueDate(parsed.data.dueDate);
  if ("error" in parsedDue) {
    return parsedDue.error;
  }
  dueDate = parsedDue.date;

  const created = await db.task.create({
    data: {
      projectId: parsed.data.projectId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId: assigneeId || null,
      createdById: actor.id,
      dueDate,
    },
    select: { id: true },
  });
  await logTask(actor.id, created.id, "created the task");
  if (assigneeId) {
    const link = taskPath(parsed.data.projectId, created.id);
    await notifyUsers({
      userIds: [assigneeId],
      actorId: actor.id,
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      body: parsed.data.title,
      link,
      email: assignmentEmail(actor, parsed.data.title, link),
    });
  }
  refreshTask(parsed.data.projectId, created.id);
  redirect(`/projects/${parsed.data.projectId}/tasks/${created.id}`);
}

export async function updateTaskStatus(
  taskId: string,
  status: string,
): Promise<{ error: string | null }> {
  const actor = await requireUser();
  if (!taskId || !isTaskStatus(status)) {
    return { error: "That status is not available." };
  }

  const task: { id: string; projectId: string; title: string; status: string; assigneeId: string | null } | null =
    await db.task.findUnique({
      where: { id: taskId },
      select: { id: true, projectId: true, title: true, status: true, assigneeId: true },
    });
  const role = task ? await actorMembership(actor.id, task.projectId) : null;
  if (
    !task ||
    !can(actor, "task.updateStatus", {
      type: "task",
      memberRole: role,
      assigneeId: task.assigneeId,
    })
  ) {
    return { error: "You cannot change this task." };
  }

  const statusLabel = taskStatusLabel[status];
  await db.task.update({
    where: { id: task.id },
    data: { status },
  });
  await logTask(actor.id, task.id, `changed the status to ${statusLabel}`);
  if (task.assigneeId && task.status !== status) {
    await notifyUsers({
      userIds: [task.assigneeId],
      actorId: actor.id,
      type: "TASK_STATUS_CHANGED",
      title: "A task status changed",
      body: `${task.title} is now ${statusLabel}`,
      link: taskPath(task.projectId, task.id),
    });
  }
  refreshTask(task.projectId, task.id);
  return { error: null };
}

export async function saveTask(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const parsed = saveSchema.safeParse({
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    priority: formData.get("priority"),
    assigneeId: formData.get("assigneeId") ?? "",
    dueDate: formData.get("dueDate") ?? "",
  });
  if (!parsed.success) {
    return "Enter a title and choose a priority.";
  }

  const task: {
    id: string;
    projectId: string;
    title: string;
    description: string | null;
    priority: string;
    assigneeId: string | null;
    dueDate: Date | null;
  } | null = await db.task.findUnique({
    where: { id: parsed.data.taskId },
    select: {
      id: true,
      projectId: true,
      title: true,
      description: true,
      priority: true,
      assigneeId: true,
      dueDate: true,
    },
  });
  const role = task ? await actorMembership(actor.id, task.projectId) : null;
  if (!task || !role) {
    return "You cannot edit this task.";
  }

  const resource = { type: "task" as const, memberRole: role, assigneeId: task.assigneeId };
  const due = parseDueDate(parsed.data.dueDate);
  if ("error" in due) {
    return due.error;
  }
  const nextAssignee = parsed.data.assigneeId.trim() || null;
  const currentDue = task.dueDate ? task.dueDate.toISOString().slice(0, 10) : "";
  const nextDue = due.date ? due.date.toISOString().slice(0, 10) : "";
  const contentChanged =
    parsed.data.title !== task.title ||
    (parsed.data.description || null) !== task.description ||
    parsed.data.priority !== task.priority ||
    nextDue !== currentDue;
  const assigneeChanged = nextAssignee !== task.assigneeId;
  if (contentChanged && !can(actor, "task.update", resource)) {
    return "You cannot edit this task.";
  }
  if (assigneeChanged && !can(actor, "task.assign", resource)) {
    return "You cannot assign this task.";
  }
  if (!contentChanged && !assigneeChanged) {
    return null;
  }
  if (assigneeChanged && nextAssignee) {
    const assignee: { user: { isActive: boolean } } | null = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId: task.projectId, userId: nextAssignee } },
      select: { user: { select: { isActive: true } } },
    });
    if (!assignee?.user.isActive) {
      return "Assign the task to an active project member.";
    }
  }

  await db.task.update({
    where: { id: task.id },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      priority: parsed.data.priority,
      assigneeId: nextAssignee,
      dueDate: due.date,
    },
  });
  if (parsed.data.title !== task.title) {
    await logTask(actor.id, task.id, "updated the title");
  }
  if ((parsed.data.description || null) !== task.description) {
    await logTask(actor.id, task.id, "updated the description");
  }
  if (parsed.data.priority !== task.priority) {
    await logTask(actor.id, task.id, `changed the priority to ${taskPriorityLabel[parsed.data.priority]}`);
  }
  if (assigneeChanged) {
    await logTask(
      actor.id,
      task.id,
      nextAssignee ? "changed the assignee" : "cleared the assignee",
    );
  }
  if (nextDue !== currentDue) {
    await logTask(actor.id, task.id, nextDue ? `changed the due date to ${nextDue}` : "cleared the due date");
  }
  if (assigneeChanged && nextAssignee) {
    const link = taskPath(task.projectId, task.id);
    await notifyUsers({
      userIds: [nextAssignee],
      actorId: actor.id,
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      body: parsed.data.title,
      link,
      email: assignmentEmail(actor, parsed.data.title, link),
    });
  }
  refreshTask(task.projectId, task.id);
  return null;
}

export async function deleteTask(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const taskId = z.string().min(1).safeParse(formData.get("taskId"));
  if (!taskId.success) {
    return "That task could not be deleted.";
  }

  const task: { id: string; projectId: string; assigneeId: string | null } | null =
    await db.task.findUnique({
      where: { id: taskId.data },
      select: { id: true, projectId: true, assigneeId: true },
    });
  const role = task ? await actorMembership(actor.id, task.projectId) : null;
  if (
    !task ||
    !can(actor, "task.delete", {
      type: "task",
      memberRole: role,
      assigneeId: task.assigneeId,
    })
  ) {
    return "You cannot delete this task.";
  }

  await logTask(actor.id, task.id, "deleted the task");
  await db.task.delete({ where: { id: task.id } });
  revalidatePath(`/projects/${task.projectId}`);
  revalidatePath("/tasks");
  redirect(`/projects/${task.projectId}?tab=tasks`);
}

export async function addTaskComment(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const parsed = commentSchema.safeParse({
    taskId: formData.get("taskId"),
    body: formData.get("body"),
  });
  if (!parsed.success) {
    return "Enter a comment up to 2000 characters.";
  }

  const task: { id: string; projectId: string; assigneeId: string | null } | null = await db.task.findUnique({
    where: { id: parsed.data.taskId },
    select: { id: true, projectId: true, assigneeId: true },
  });
  const role = task ? await actorMembership(actor.id, task.projectId) : null;
  if (
    !task ||
    !can(actor, "task.comment", {
      type: "task",
      memberRole: role,
      assigneeId: task.assigneeId,
    })
  ) {
    return "You cannot comment on this task.";
  }

  await db.taskComment.create({
    data: { taskId: task.id, authorId: actor.id, body: parsed.data.body },
  });
  await logTask(actor.id, task.id, "added a comment");
  refreshTask(task.projectId, task.id);
  return null;
}
