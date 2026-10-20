"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});

export async function login(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return "Enter a valid email and password.";
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email.toLowerCase(),
      password: parsed.data.password,
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return "Invalid email or password.";
    }
    throw error;
  }

  return null;
}

export async function signOutUser() {
  await signOut({ redirectTo: "/login" });
}
