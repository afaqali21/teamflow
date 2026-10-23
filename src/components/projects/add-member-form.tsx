"use client";

import { useActionState } from "react";
import { addProjectMember, type ProjectFormState } from "@/actions/projects";
import { Button } from "@/components/ui/button";

const initialState: ProjectFormState = { error: null };

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AddMemberForm({
  projectId,
  people,
}: {
  projectId: string;
  people: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState(addProjectMember, initialState);

  if (people.length === 0) {
    return <p className="text-sm text-muted-foreground">Everyone active is already a member.</p>;
  }

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3 sm:flex-row sm:items-center">
      <input type="hidden" name="projectId" value={projectId} />
      <select name="userId" required defaultValue="" aria-label="Person to add" className={fieldClassName}>
        <option value="" disabled>
          Add a person
        </option>
        {people.map((person) => (
          <option key={person.id} value={person.id}>
            {person.label}
          </option>
        ))}
      </select>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding..." : "Add"}
      </Button>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive sm:basis-full">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
