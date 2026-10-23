"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import {
  createProjectFileKey,
  isProjectFileKey,
  validateProjectFileUpload,
} from "@/lib/project-files";
import type { ProjectMemberRole } from "@/lib/roles";
import { deleteObject, inspectObject, isR2Configured, presignGet, presignPut } from "@/lib/r2";
import { requireUser } from "@/lib/session";

const requestSchema = z.object({
  projectId: z.string().min(1),
  name: z.string().trim().min(1).max(200),
  size: z.number().int().positive(),
  mimeType: z.string().min(1).max(120),
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

function refreshFiles(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/files");
}

async function logFile(actorId: string, fileId: string, action: string) {
  await db.activityLog.create({
    data: { actorId, action, entityType: "file", entityId: fileId },
  });
}

export type UploadTicket = {
  error: string | null;
  fileId: string | null;
  uploadUrl: string | null;
};

export async function requestUpload(input: {
  projectId: string;
  name: string;
  size: number;
  mimeType: string;
}): Promise<UploadTicket> {
  const actor = await requireUser();
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Choose a valid file to upload.", fileId: null, uploadUrl: null };
  }

  const invalid = validateProjectFileUpload(parsed.data);
  if (invalid) {
    return { error: invalid, fileId: null, uploadUrl: null };
  }

  const role = await actorMembership(actor.id, parsed.data.projectId);
  if (!can(actor, "file.upload", { type: "project", memberRole: role })) {
    return { error: "You cannot upload files to this project.", fileId: null, uploadUrl: null };
  }

  if (!isR2Configured()) {
    return { error: "File storage is not configured.", fileId: null, uploadUrl: null };
  }

  const pending = await db.file.create({
    data: {
      projectId: parsed.data.projectId,
      uploaderId: actor.id,
      name: parsed.data.name.trim(),
      key: `pending/${crypto.randomUUID()}`,
      size: parsed.data.size,
      mimeType: parsed.data.mimeType,
      status: "PENDING",
    },
    select: { id: true },
  });

  const key = createProjectFileKey(parsed.data.projectId, pending.id, parsed.data.mimeType);
  if (!key) {
    await db.file.delete({ where: { id: pending.id } });
    return { error: "That file type is not allowed.", fileId: null, uploadUrl: null };
  }

  const uploadUrl = await presignPut(key, parsed.data.mimeType);
  if (!uploadUrl) {
    await db.file.delete({ where: { id: pending.id } });
    return { error: "File storage is not configured.", fileId: null, uploadUrl: null };
  }

  await db.file.update({
    where: { id: pending.id },
    data: { key },
  });

  return { error: null, fileId: pending.id, uploadUrl };
}

export async function confirmUpload(fileId: string): Promise<{ error: string | null }> {
  const actor = await requireUser();
  if (!fileId) {
    return { error: "That upload could not be confirmed." };
  }

  const file: {
    id: string;
    projectId: string;
    uploaderId: string;
    name: string;
    key: string;
    size: number;
    mimeType: string;
    status: string;
  } | null = await db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
      uploaderId: true,
      name: true,
      key: true,
      size: true,
      mimeType: true,
      status: true,
    },
  });
  if (!file || file.uploaderId !== actor.id || file.status !== "PENDING") {
    return { error: "That upload could not be confirmed." };
  }

  const role = await actorMembership(actor.id, file.projectId);
  if (!can(actor, "file.upload", { type: "project", memberRole: role })) {
    return { error: "You cannot upload files to this project." };
  }
  if (!isProjectFileKey(file.projectId, file.key)) {
    return { error: "That upload is invalid." };
  }

  let inspected: { size: number; mimeType: string } | null;
  try {
    inspected = await inspectObject(file.key);
  } catch {
    return { error: "The upload did not finish. Try again." };
  }
  if (!inspected) {
    return { error: "File storage is not configured." };
  }

  const mimeType = inspected.mimeType || file.mimeType;
  const invalid = validateProjectFileUpload({
    name: file.name,
    size: inspected.size,
    mimeType,
  });
  if (invalid || inspected.size !== file.size) {
    await deleteObject(file.key).catch(() => undefined);
    await db.file.delete({ where: { id: file.id } });
    return { error: invalid ?? "The uploaded file did not match what was requested." };
  }

  await db.file.update({
    where: { id: file.id },
    data: {
      status: "READY",
      mimeType,
      size: inspected.size,
    },
  });
  await logFile(actor.id, file.id, `uploaded ${file.name}`);
  refreshFiles(file.projectId);
  return { error: null };
}

export async function requestDownload(
  fileId: string,
): Promise<{ error: string | null; url: string | null }> {
  const actor = await requireUser();
  if (!fileId) {
    return { error: "That file could not be downloaded.", url: null };
  }

  const file: {
    id: string;
    projectId: string;
    name: string;
    key: string;
    status: string;
  } | null = await db.file.findUnique({
    where: { id: fileId },
    select: { id: true, projectId: true, name: true, key: true, status: true },
  });
  const role = file ? await actorMembership(actor.id, file.projectId) : null;
  if (
    !file ||
    file.status !== "READY" ||
    !can(actor, "project.view", { type: "project", memberRole: role })
  ) {
    return { error: "You cannot download this file.", url: null };
  }

  const url = await presignGet(file.key, {
    fileName: file.name,
    disposition: "attachment",
  });
  if (!url) {
    return { error: "File storage is not configured.", url: null };
  }
  return { error: null, url };
}

export async function requestPreview(
  fileId: string,
): Promise<{ error: string | null; url: string | null; mimeType: string | null }> {
  const actor = await requireUser();
  if (!fileId) {
    return { error: "That file could not be previewed.", url: null, mimeType: null };
  }

  const file: {
    id: string;
    projectId: string;
    name: string;
    key: string;
    mimeType: string;
    status: string;
  } | null = await db.file.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      projectId: true,
      name: true,
      key: true,
      mimeType: true,
      status: true,
    },
  });
  const role = file ? await actorMembership(actor.id, file.projectId) : null;
  if (
    !file ||
    file.status !== "READY" ||
    !can(actor, "project.view", { type: "project", memberRole: role })
  ) {
    return { error: "You cannot preview this file.", url: null, mimeType: null };
  }

  const url = await presignGet(file.key, {
    fileName: file.name,
    disposition: "inline",
  });
  if (!url) {
    return { error: "File storage is not configured.", url: null, mimeType: null };
  }
  return { error: null, url, mimeType: file.mimeType };
}

export async function deleteProjectFile(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await requireUser();
  const fileId = z.string().min(1).safeParse(formData.get("fileId"));
  if (!fileId.success) {
    return "That file could not be deleted.";
  }

  const file: {
    id: string;
    projectId: string;
    uploaderId: string;
    name: string;
    key: string;
  } | null = await db.file.findUnique({
    where: { id: fileId.data },
    select: { id: true, projectId: true, uploaderId: true, name: true, key: true },
  });
  const role = file ? await actorMembership(actor.id, file.projectId) : null;
  if (
    !file ||
    !can(actor, "file.delete", {
      type: "file",
      memberRole: role,
      uploaderId: file.uploaderId,
    })
  ) {
    return "You cannot delete this file.";
  }

  await logFile(actor.id, file.id, `deleted ${file.name}`);
  await deleteObject(file.key).catch(() => undefined);
  await db.file.delete({ where: { id: file.id } });
  refreshFiles(file.projectId);
  return null;
}
