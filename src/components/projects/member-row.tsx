"use client";

import { useActionState } from "react";
import { removeProjectMember, type ProjectFormState } from "@/actions/projects";
import { Button } from "@/components/ui/button";

const initialState: ProjectFormState = { error: null };

export function MemberRow({
  projectId,
  userId,
  name,
  email,
  role,
  canRemove,
}: {
  projectId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  canRemove: boolean;
}) {
  const [state, action, pending] = useActionState(removeProjectMember, initialState);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">
          {email} · {role}
        </p>
      </div>
      {canRemove ? (
        <form action={action} className="flex items-center gap-3">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="userId" value={userId} />
          <Button type="submit" variant="outline" disabled={pending}>
            {pending ? "Removing..." : "Remove"}
          </Button>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
        </form>
      ) : null}
    </li>
  );
}
