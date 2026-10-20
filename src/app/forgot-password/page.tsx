import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-muted-foreground">Teamflow</p>
          <h1 className="text-2xl font-semibold tracking-tight">Forgot password</h1>
          <p className="text-sm text-muted-foreground">
            We will email a one-time link that expires in 48 hours.
          </p>
        </div>
        <ForgotPasswordForm />
        <p className="text-center text-sm">
          <Link href="/login" className="font-medium underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
