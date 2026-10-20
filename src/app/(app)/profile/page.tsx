import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { isOwnAvatarKey } from "@/lib/avatar";
import { presignAvatarGet } from "@/lib/r2";
import { requireUser } from "@/lib/session";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-6 py-10">
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </main>
      }
    >
      <ProfilePanel />
    </Suspense>
  );
}

async function ProfilePanel() {
  const user = await requireUser();
  let avatarUrl: string | null = null;
  if (user.image && isOwnAvatarKey(user.id, user.image)) {
    try {
      avatarUrl = await presignAvatarGet(user.image);
    } catch {
      avatarUrl = null;
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Account</p>
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
      </div>
      <ProfileForm name={user.name ?? ""} avatarUrl={avatarUrl} />
    </main>
  );
}
