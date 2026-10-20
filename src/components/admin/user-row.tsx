"use client";

import { useActionState } from "react";
import { setUserActive, updateUser } from "@/actions/users";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/roles";

const fieldClassName =
  "flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function UserRow({
  user,
  isSelf,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    isActive: boolean;
  };
  isSelf: boolean;
}) {
  const [error, action, pending] = useActionState(updateUser, null);

  return (
    <tr className="border-t border-border">
      <td className="px-3 py-3 align-top">
        <form id={`user-${user.id}`} action={action} className="space-y-2">
          <input type="hidden" name="userId" value={user.id} />
          {isSelf ? <input type="hidden" name="role" value={user.role} /> : null}
          <input
            name="name"
            required
            defaultValue={user.name ?? ""}
            aria-label={`Name for ${user.email}`}
            className={fieldClassName}
          />
          <p className="text-xs text-muted-foreground">{user.email}</p>
        </form>
      </td>
      <td className="px-3 py-3 align-top">
        <select
          name={isSelf ? undefined : "role"}
          form={`user-${user.id}`}
          defaultValue={user.role}
          disabled={isSelf}
          aria-label={`Role for ${user.email}`}
          className={fieldClassName}
        >
          <option value="EMPLOYEE">Employee</option>
          <option value="MANAGER">Manager</option>
          <option value="ADMIN">Admin</option>
        </select>
      </td>
      <td className="px-3 py-3 align-top text-sm">
        {user.isActive ? "Active" : "Inactive"}
      </td>
      <td className="px-3 py-3 align-top">
        <div className="flex flex-col gap-2">
          <Button type="submit" form={`user-${user.id}`} disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
          {isSelf ? null : (
            <form action={setUserActive}>
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="isActive" value={user.isActive ? "false" : "true"} />
              <Button type="submit" variant="outline">
                {user.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            </form>
          )}
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
