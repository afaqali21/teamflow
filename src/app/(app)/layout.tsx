import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { isOwnAvatarKey } from "@/lib/avatar";
import { presignAvatarGet } from "@/lib/r2";
import { requireUser } from "@/lib/session";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <p className="px-6 py-10 text-sm text-muted-foreground">Loading your workspace...</p>
      }
    >
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const avatarUrl = await displayAvatar(user.id, user.image);

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl,
      }}
    >
      {children}
    </AppShell>
  );
}

async function displayAvatar(userId: string, image: string | null) {
  if (!image) {
    return null;
  }
  if (image.startsWith("https://") || image.startsWith("http://")) {
    return image;
  }
  if (!isOwnAvatarKey(userId, image)) {
    return null;
  }

  try {
    return await presignAvatarGet(image);
  } catch {
    return null;
  }
}
