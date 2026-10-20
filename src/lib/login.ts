import { z } from "zod";
import type { Role } from "@/lib/roles";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1).max(200),
});

export type LoginUser = {
  id: string;
  name: string | null;
  email: string;
  passwordHash: string | null;
  role: Role;
  isActive: boolean;
};

export type AuthenticatedUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
};

export async function verifyLogin(
  credentials: unknown,
  findUser: (email: string) => Promise<LoginUser | null>,
  comparePassword: (password: string, passwordHash: string) => Promise<boolean>,
): Promise<AuthenticatedUser | null> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) {
    return null;
  }

  const user = await findUser(parsed.data.email.toLowerCase());
  if (!user?.passwordHash || !user.isActive) {
    return null;
  }

  const passwordMatches = await comparePassword(parsed.data.password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
