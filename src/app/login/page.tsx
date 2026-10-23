import { Network, Shield } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 md:px-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-tr from-surface-low via-surface/90 to-surface-high/70" />
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-32 -bottom-48 size-[32rem] rounded-full bg-secondary/15 blur-3xl" />
      </div>

      <div className="relative z-10 flex w-full max-w-[480px] flex-col items-center">
        <div className="mb-6 flex items-center gap-1.5 rounded-full bg-card/90 px-3.5 py-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground shadow-sm backdrop-blur-md">
          <span className="inline-flex size-2 animate-pulse rounded-full bg-secondary" />
          <span className="text-foreground">Teamflow</span>
          <span className="text-outline">•</span>
          <span>Private workspace</span>
        </div>

        <div className="w-full rounded-3xl bg-card p-8 shadow-xl sm:p-10">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-tr from-primary to-[#4f46e5] text-primary-foreground shadow-md shadow-primary/20">
                <Network className="size-6" />
              </div>
              <div>
                <p className="text-lg font-semibold leading-none tracking-tight">Teamflow</p>
                <p className="mt-1 text-[11px] font-semibold tracking-wider text-outline uppercase">
                  Core System
                </p>
              </div>
            </div>
            <div className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
              v0.1
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-[22px] font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Sign in to access your team projects, chat, and tasks.
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 flex items-start gap-3 rounded-2xl bg-muted p-3.5 text-left">
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-high text-primary">
              <Shield className="size-3.5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold tracking-wide text-foreground">
                Closed organizational directory
              </p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">
                Team accounts are provisioned by an admin. If you need access or a password reset, contact
                your workspace administrator.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-4 flex flex-col items-center gap-1.5 text-center text-outline">
          <p className="flex items-center gap-2 text-[11px] font-semibold">
            <Shield className="size-3.5 text-secondary" />
            Enterprise-ready workspace sign-in
          </p>
          <p className="text-[13px] text-outline/80">© 2026 Teamflow</p>
        </footer>
      </div>
    </main>
  );
}
