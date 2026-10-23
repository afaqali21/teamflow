import { Suspense } from "react";
import { Network } from "lucide-react";
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
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-surface-low via-surface/90 to-surface-high/70" />
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/15 blur-3xl" />
      </div>
      <div className="w-full max-w-[420px] rounded-3xl bg-card p-8 shadow-xl sm:p-10">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-[#4f46e5] text-primary-foreground shadow-md">
            <Network className="size-6" />
          </span>
          <div>
            <p className="font-semibold tracking-tight">Teamflow</p>
            <p className="text-[11px] font-semibold tracking-wider text-outline uppercase">Core System</p>
          </div>
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight">Set password</h1>
        <div className="mt-6">
          <SetPasswordForm token={query.token ?? ""} />
        </div>
      </div>
    </main>
  );
}
