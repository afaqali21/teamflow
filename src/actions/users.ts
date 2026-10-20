"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordEmail } from "@/lib/email";
import { issuePasswordToken } from "@/lib/password-reset";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { requireUser } from "@/lib/session";

const roleSchema = z.enum(["ADMIN", "MANAGER", "EMPLOYEE"]);

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  role: roleSchema,
});

const updateUserSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  role: roleSchema,
});

const activeSchema = z.object({
  userId: z.string().min(1),
  isActive: z.enum(["true", "false"]),
});

export type CreateUserState = {
  error: string | null;
  inviteUrl: string | null;
};

async function currentActor() {
  const user = await requireUser();
  return {
    id: user.id,
    role: user.role,
    isActive: user.isActive,
  };
}

function appOrigin() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function createUser(
  _previous: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  const actor = await currentActor();
  if (!can(actor, "users.create")) {
    return { error: "You don't have permission to create users.", inviteUrl: null };
  }

  const parsed = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: "Enter a name, a valid email, and a role.", inviteUrl: null };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return { error: "A user with that email already exists.", inviteUrl: null };
  }

  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      isActive: true,
    },
  });

  const token = await issuePasswordToken(email);
  const inviteUrl = `${appOrigin()}/set-password?token=${encodeURIComponent(token)}`;

  try {
    const delivery = await sendPasswordEmail({ to: email, url: inviteUrl, reason: "invite" });
    revalidatePath("/admin/users");
    return {
      error: null,
      inviteUrl: delivery.delivered ? null : inviteUrl,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The invitation email could not be sent.";
    return { error: message, inviteUrl: null };
  }
}

export async function updateUser(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const actor = await currentActor();
  const parsed = updateUserSchema.safeParse({
    userId: formData.get("userId"),
    name: formData.get("name"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return "Enter a name and a role.";
  }

  const nextRole = parsed.data.role as Role;
  if (!can(actor, "users.update", { type: "user", userId: parsed.data.userId, nextRole })) {
    return "You can't change that user.";
  }

  await db.user.update({
    where: { id: parsed.data.userId },
    data: {
      name: parsed.data.name,
      role: nextRole,
    },
  });
  revalidatePath("/admin/users");
  return null;
}

export async function setUserActive(formData: FormData) {
  const actor = await currentActor();
  const parsed = activeSchema.safeParse({
    userId: formData.get("userId"),
    isActive: formData.get("isActive"),
  });
  if (!parsed.success) {
    return;
  }

  if (!can(actor, "users.deactivate", { type: "user", userId: parsed.data.userId })) {
    return;
  }

  await db.user.update({
    where: { id: parsed.data.userId },
    data: { isActive: parsed.data.isActive === "true" },
  });
  revalidatePath("/admin/users");
}
