"use client";

import { useActionState } from "react";
import { startDirectMessage } from "@/actions/direct-messages";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function StartDirectMessageForm({ people }: { people: { id: string; label: string }[] }) {
  const [error, action, pending] = useActionState(startDirectMessage, null);

  if (people.length === 0) {
    return <p className="text-sm text-muted-foreground">No one else is available to message.</p>;
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
      <select name="userId" required defaultValue="" aria-label="Person to message" className={fieldClassName}>
        <option value="" disabled>
          Choose a person
        </option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.label}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Starting..." : "Start conversation"}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  );
}
