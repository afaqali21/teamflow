"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendPasswordEmail } from "@/lib/email";
import { consumePasswordToken, issuePasswordToken } from "@/lib/password-reset";

const requestSchema = z.object({
  email: z.email(),
});

const setPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(200),
});

export type PasswordFormState = {
  error: string | null;
  done: boolean;
};

function appOrigin() {
  return process.env.AUTH_URL ?? "http://localhost:3000";
}

export async function requestPasswordReset(
  _previous: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: "Enter a valid email.", done: false };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { email: true, isActive: true },
  });

  if (user?.isActive) {
    const token = await issuePasswordToken(user.email);
    const url = `${appOrigin()}/set-password?token=${encodeURIComponent(token)}`;
    try {
      await sendPasswordEmail({ to: user.email, url, reason: "reset" });
    } catch (error) {
      console.error(error);
    }
  }

  return { error: null, done: true };
}

export async function setPassword(
  _previous: PasswordFormState,
  formData: FormData,
): Promise<PasswordFormState> {
  const parsed = setPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "Use at least 8 characters.", done: false };
  }

  const email = await consumePasswordToken(parsed.data.token);
  if (!email) {
    return { error: "This link is invalid or has expired.", done: false };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const updated = await db.user.updateMany({
    where: { email },
    data: { passwordHash },
  });
  if (updated.count === 0) {
    return { error: "This link is invalid or has expired.", done: false };
  }

  return { error: null, done: true };
}
