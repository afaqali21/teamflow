"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAvatarKey, isOwnAvatarKey, validateAvatarUpload } from "@/lib/avatar";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { deleteAvatarObject, inspectAvatarObject, presignAvatarPut } from "@/lib/r2";
import { requireUser } from "@/lib/session";

const nameSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export type ProfileState = {
  error: string | null;
  saved: boolean;
};

function ownProfile(actor: { id: string; role: "ADMIN" | "MANAGER" | "EMPLOYEE"; isActive: boolean }) {
  return can(actor, "profile.update", { type: "user", userId: actor.id });
}

export async function updateProfileName(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const actor = await requireUser();
  if (!ownProfile(actor)) {
    return { error: "You don't have permission to edit this profile.", saved: false };
  }

  const parsed = nameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: "Enter a name up to 80 characters.", saved: false };
  }

  await db.user.update({
    where: { id: actor.id },
    data: { name: parsed.data.name },
  });
  revalidatePath("/", "layout");
  return { error: null, saved: true };
}

export type AvatarUploadTicket = {
  error: string | null;
  uploadUrl: string | null;
  key: string | null;
};

export async function requestAvatarUpload(input: {
  size: number;
  mimeType: string;
}): Promise<AvatarUploadTicket> {
  const actor = await requireUser();
  if (!ownProfile(actor)) {
    return { error: "You don't have permission to edit this profile.", uploadUrl: null, key: null };
  }

  const invalid = validateAvatarUpload(input);
  if (invalid) {
    return { error: invalid, uploadUrl: null, key: null };
  }

  const key = createAvatarKey(actor.id, input.mimeType, randomBytes(16).toString("base64url"));
  if (!key) {
    return { error: "Use a JPEG, PNG, WebP, or GIF.", uploadUrl: null, key: null };
  }

  const uploadUrl = await presignAvatarPut(key, input.mimeType);
  if (!uploadUrl) {
    return { error: "Avatar storage is not configured.", uploadUrl: null, key: null };
  }

  return { error: null, uploadUrl, key };
}

export async function confirmAvatarUpload(key: string): Promise<{ error: string | null }> {
  const actor = await requireUser();
  if (!ownProfile(actor)) {
    return { error: "You don't have permission to edit this profile." };
  }
  if (!isOwnAvatarKey(actor.id, key)) {
    return { error: "That file is not yours." };
  }

  let inspected: { size: number; mimeType: string } | null;
  try {
    inspected = await inspectAvatarObject(key);
  } catch {
    return { error: "The upload did not finish. Try again." };
  }
  if (!inspected) {
    return { error: "Avatar storage is not configured." };
  }

  const invalid = validateAvatarUpload(inspected);
  if (invalid) {
    await deleteAvatarObject(key).catch(() => undefined);
    return { error: invalid };
  }

  const previous = await db.user.findUnique({
    where: { id: actor.id },
    select: { image: true },
  });
  await db.user.update({
    where: { id: actor.id },
    data: { image: key },
  });

  if (previous?.image && previous.image !== key && isOwnAvatarKey(actor.id, previous.image)) {
    await deleteAvatarObject(previous.image).catch(() => undefined);
  }

  revalidatePath("/", "layout");
  return { error: null };
}
