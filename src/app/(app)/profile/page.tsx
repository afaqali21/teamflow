import { Suspense } from "react";
import { ProfileForm } from "@/components/profile/profile-form";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { isOwnAvatarKey } from "@/lib/avatar";
import { presignAvatarGet } from "@/lib/r2";
import { requireUser } from "@/lib/session";

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </PageFrame>
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
    <PageFrame
      crumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Profile" },
      ]}
    >
      <PageHeader eyebrow="Account" title="Profile" description={user.email} />
      <SurfaceCard>
        <ProfileForm name={user.name ?? ""} avatarUrl={avatarUrl} />
      </SurfaceCard>
    </PageFrame>
  );
}
