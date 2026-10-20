"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState } from "@/actions/users";
import { Button } from "@/components/ui/button";

const initialState: CreateUserState = { error: null, inviteUrl: null };

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function CreateUserForm() {
  const [state, action, pending] = useActionState(createUser, initialState);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-4">
      <input name="name" required placeholder="Name" className={fieldClassName} />
      <input name="email" type="email" required placeholder="Email" className={fieldClassName} />
      <select name="role" required defaultValue="EMPLOYEE" className={fieldClassName}>
        <option value="EMPLOYEE">Employee</option>
        <option value="MANAGER">Manager</option>
        <option value="ADMIN">Admin</option>
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create user"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive sm:col-span-4">
          {state.error}
        </p>
      ) : null}
      {state.inviteUrl ? (
        <p className="text-sm text-muted-foreground sm:col-span-4">
          Email is not configured, so the set-password link is here:{" "}
          <a className="underline" href={state.inviteUrl}>
            Set password
          </a>
        </p>
      ) : null}
    </form>
  );
}
