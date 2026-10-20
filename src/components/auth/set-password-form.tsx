"use client";

import { useActionState } from "react";
import Link from "next/link";
import { setPassword, type PasswordFormState } from "@/actions/password";
import { Button } from "@/components/ui/button";

const initialState: PasswordFormState = { error: null, done: false };

export function SetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(setPassword, initialState);

  if (!token) {
    return <p className="text-sm text-destructive">This link is missing a token.</p>;
  }

  if (state.done) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Password saved.{" "}
        <Link href="/login" className="font-medium text-foreground underline">
          Sign in
        </Link>
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Saving..." : "Save password"}
      </Button>
    </form>
  );
}
