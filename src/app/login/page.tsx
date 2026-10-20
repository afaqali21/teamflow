import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">Teamflow</p>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Use the email and password for your workspace account.
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="font-medium underline">
            Forgot password
          </Link>
        </p>
      </div>
    </main>
  );
}
