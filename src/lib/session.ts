import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      isActive: true,
    },
  });

  if (!user?.isActive) {
    await signOut({ redirectTo: "/login" });
  }

  if (!user) {
    redirect("/login");
  }

  return user;
}
