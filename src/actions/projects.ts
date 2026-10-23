"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { appOrigin, notifyUsers } from "@/lib/notifications";
import { can } from "@/lib/permissions";
import { removalBlockReason } from "@/lib/project-members";
import type { ProjectMemberRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(2000),
});

const memberSchema = z.object({
  projectId: z.string().min(1),
  userId: z.string().min(1),
});

const archiveSchema = z.object({
  projectId: z.string().min(1),
  archived: z.enum(["true", "false"]),
});

export type ProjectFormState = {
  error: string | null;
};

async function membership(actorId: string, projectId: string) {
  const member = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actorId } },
    select: { role: true },
  });
  const memberRole: ProjectMemberRole | null =
    member?.role === "OWNER" || member?.role === "MEMBER" ? member.role : null;
  return { type: "project" as const, memberRole };
}

function refreshProject(projectId: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  revalidatePath(`/projects/${projectId}`);
}

export async function createProject(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const actor = await requireUser();
  if (!can(actor, "projects.create")) {
    return { error: "You do not have permission to create projects." };
  }

  const description = formData.get("description");
  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: typeof description === "string" ? description.trim() : "",
  });
  if (!parsed.success) {
    return { error: "Enter a project name up to 80 characters." };
  }

  const requestedIds = [
    ...new Set(
      formData
        .getAll("memberId")
        .filter((value): value is string => typeof value === "string" && value !== actor.id),
    ),
  ];
  const people: { id: string }[] = requestedIds.length
    ? await db.user.findMany({
        where: { id: { in: requestedIds }, isActive: true },
        select: { id: true },
      })
    : [];
  const memberIds = [actor.id, ...people.map((person) => person.id)];

  const project = await db.project.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      members: {
        create: memberIds.map((userId) => ({
          userId,
          role: userId === actor.id ? "OWNER" : "MEMBER",
        })),
      },
      channels: {
        create: {
          type: "PROJECT",
          name: "general",
          members: { create: memberIds.map((userId) => ({ userId })) },
        },
      },
    },
    select: { id: true, name: true },
  });

  const invited = people.map((person) => person.id);
  if (invited.length > 0) {
    const who = actor.name?.trim() || actor.email;
    const link = `/projects/${project.id}`;
    await notifyUsers({
      userIds: invited,
      actorId: actor.id,
      type: "PROJECT_ADDED",
      title: "Added to a project",
      body: `${who} added you to ${project.name}`,
      link,
      email: {
        subject: `You were added to ${project.name}`,
        text: `${who} added you to “${project.name}” on Teamflow.\n\n${appOrigin()}${link}\n`,
      },
    });
  }

  refreshProject(project.id);
  redirect(`/projects/${project.id}?tab=people`);
}

export async function addProjectMember(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const actor = await requireUser();
  const parsed = memberSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    return { error: "Choose a person to add." };
  }

  const resource = await membership(actor.id, parsed.data.projectId);
  if (!can(actor, "project.manageMembers", resource)) {
    return { error: "You do not have permission to manage members." };
  }

  const person = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, isActive: true },
  });
  if (!person?.isActive) {
    return { error: "Choose an active person." };
  }

  const already = await db.projectMember.findUnique({
    where: {
      projectId_userId: { projectId: parsed.data.projectId, userId: person.id },
    },
    select: { id: true },
  });
  if (already) {
    return { error: "That person is already a member." };
  }

  const [channels, project]: [{ id: string }[], { name: string } | null] = await Promise.all([
    db.channel.findMany({
      where: { projectId: parsed.data.projectId, type: "PROJECT" },
      select: { id: true },
    }),
    db.project.findUnique({
      where: { id: parsed.data.projectId },
      select: { name: true },
    }),
  ]);
  if (!project) {
    return { error: "That project could not be found." };
  }

  await db.$transaction([
    db.projectMember.create({
      data: { projectId: parsed.data.projectId, userId: person.id, role: "MEMBER" },
    }),
    db.channelMember.createMany({
      data: channels.map((channel) => ({ channelId: channel.id, userId: person.id })),
      skipDuplicates: true,
    }),
  ]);

  const who = actor.name?.trim() || actor.email;
  const link = `/projects/${parsed.data.projectId}`;
  await notifyUsers({
    userIds: [person.id],
    actorId: actor.id,
    type: "PROJECT_ADDED",
    title: "Added to a project",
    body: `${who} added you to ${project.name}`,
    link,
    email: {
      subject: `You were added to ${project.name}`,
      text: `${who} added you to “${project.name}” on Teamflow.\n\n${appOrigin()}${link}\n`,
    },
  });

  refreshProject(parsed.data.projectId);
  return { error: null };
}

export async function removeProjectMember(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const actor = await requireUser();
  const parsed = memberSchema.safeParse({
    projectId: formData.get("projectId"),
    userId: formData.get("userId"),
  });
  if (!parsed.success) {
    return { error: "Choose a person to remove." };
  }

  const resource = await membership(actor.id, parsed.data.projectId);
  if (!can(actor, "project.manageMembers", resource)) {
    return { error: "You do not have permission to manage members." };
  }

  const members: { id: string; userId: string; role: "OWNER" | "MEMBER" }[] =
    await db.projectMember.findMany({
    where: { projectId: parsed.data.projectId },
    select: { id: true, userId: true, role: true },
  });
  const target = members.find((member) => member.userId === parsed.data.userId);
  if (!target || (target.role !== "OWNER" && target.role !== "MEMBER")) {
    return { error: "That person is not a member." };
  }

  const ownerCount = members.filter((member) => member.role === "OWNER").length;
  const blocked = removalBlockReason(target.role, ownerCount);
  if (blocked) {
    return { error: blocked };
  }

  await db.$transaction([
    db.channelMember.deleteMany({
      where: { userId: target.userId, channel: { projectId: parsed.data.projectId } },
    }),
    db.projectMember.delete({ where: { id: target.id } }),
  ]);

  refreshProject(parsed.data.projectId);
  return { error: null };
}

export async function setProjectArchived(
  _previous: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const actor = await requireUser();
  const parsed = archiveSchema.safeParse({
    projectId: formData.get("projectId"),
    archived: formData.get("archived"),
  });
  if (!parsed.success) {
    return { error: "The project could not be updated." };
  }

  const resource = await membership(actor.id, parsed.data.projectId);
  if (!can(actor, "project.archive", resource)) {
    return { error: "You do not have permission to archive this project." };
  }

  await db.project.update({
    where: { id: parsed.data.projectId },
    data: { archivedAt: parsed.data.archived === "true" ? new Date() : null },
  });

  refreshProject(parsed.data.projectId);
  return { error: null };
}
