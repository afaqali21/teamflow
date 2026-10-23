"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { ProjectMemberRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";

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

function refreshTask(projectId: string, taskId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
}

export async function attachFileToTask(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const parsed = z
    .object({
      taskId: z.string().min(1),
      fileId: z.string().min(1),
    })
    .safeParse({
      taskId: formData.get("taskId"),
      fileId: formData.get("fileId"),
    });
  if (!parsed.success) {
    return "Choose a file to attach.";
  }

  const task: { id: string; projectId: string; assigneeId: string | null } | null =
    await db.task.findUnique({
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
    return "You cannot attach files to this task.";
  }

  const file: { id: string; projectId: string; status: string } | null = await db.file.findUnique({
    where: { id: parsed.data.fileId },
    select: { id: true, projectId: true, status: true },
  });
  if (!file || file.status !== "READY" || file.projectId !== task.projectId) {
    return "Choose a ready file from this project.";
  }

  const existing = await db.attachment.findFirst({
    where: { taskId: task.id, fileId: file.id },
    select: { id: true },
  });
  if (existing) {
    return "That file is already attached.";
  }

  await db.attachment.create({
    data: { taskId: task.id, fileId: file.id },
  });
  await db.activityLog.create({
    data: {
      actorId: actor.id,
      action: "attached a file",
      entityType: "task",
      entityId: task.id,
    },
  });
  refreshTask(task.projectId, task.id);
  return null;
}

export async function removeTaskAttachment(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const attachmentId = z.string().min(1).safeParse(formData.get("attachmentId"));
  if (!attachmentId.success) {
    return "That attachment could not be removed.";
  }

  const attachment: {
    id: string;
    taskId: string | null;
    file: { uploaderId: string; projectId: string };
    task: { id: string; projectId: string; assigneeId: string | null } | null;
  } | null = await db.attachment.findUnique({
    where: { id: attachmentId.data },
    select: {
      id: true,
      taskId: true,
      file: { select: { uploaderId: true, projectId: true } },
      task: { select: { id: true, projectId: true, assigneeId: true } },
    },
  });
  if (!attachment?.task || !attachment.taskId) {
    return "That attachment could not be removed.";
  }

  const role = await actorMembership(actor.id, attachment.task.projectId);
  const canRemoveFile = can(actor, "file.delete", {
    type: "file",
    memberRole: role,
    uploaderId: attachment.file.uploaderId,
  });
  const canEditTask = can(actor, "task.update", {
    type: "task",
    memberRole: role,
    assigneeId: attachment.task.assigneeId,
  });
  if (!canRemoveFile && !canEditTask) {
    return "You cannot remove this attachment.";
  }

  await db.attachment.delete({ where: { id: attachment.id } });
  await db.activityLog.create({
    data: {
      actorId: actor.id,
      action: "removed an attachment",
      entityType: "task",
      entityId: attachment.task.id,
    },
  });
  refreshTask(attachment.task.projectId, attachment.task.id);
  return null;
}
