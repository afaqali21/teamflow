import { Suspense } from "react";
import { SetPasswordForm } from "@/components/auth/set-password-form";

export default function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <main className="flex flex-1 items-center justify-center px-6">
          <p className="text-sm text-muted-foreground">Loading link...</p>
        </main>
      }
    >
      <SetPasswordPanel searchParams={searchParams} />
    </Suspense>
  );
}

async function SetPasswordPanel({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const query = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">Teamflow</p>
          <h1 className="text-2xl font-semibold tracking-tight">Set password</h1>
        </div>
        <SetPasswordForm token={query.token ?? ""} />
      </div>
    </main>
  );
}
