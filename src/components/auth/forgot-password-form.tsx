"use client";

import { useActionState } from "react";
import { requestPasswordReset, type PasswordFormState } from "@/actions/password";
import { Button } from "@/components/ui/button";

const initialState: PasswordFormState = { error: null, done: false };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  if (state.done) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        If an active account uses that email, a reset link is on its way. The link expires in 48
        hours.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
    </form>
  );
}
