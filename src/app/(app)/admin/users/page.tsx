import { Suspense } from "react";
import Link from "next/link";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRow } from "@/components/admin/user-row";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { requireUser } from "@/lib/session";

type UsersQuery = {
  q?: string;
  role?: string;
};

export default function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<UsersQuery>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-6 py-10">
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </main>
      }
    >
      <UsersPanel searchParams={searchParams} />
    </Suspense>
  );
}

async function UsersPanel({ searchParams }: { searchParams: Promise<UsersQuery> }) {
  const actor = await requireUser();
  const query = await searchParams;

  if (!can(actor, "users.list")) {
    return (
      <main className="mx-auto w-full max-w-lg px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You do not have permission to manage users.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium underline">
          Back home
        </Link>
      </main>
    );
  }

  const q = query.q?.trim() ?? "";
  const role = isRole(query.role) ? query.role : "";
  const users = await db.user.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true },
    orderBy: [{ name: "asc" }, { email: "asc" }],
  });

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-10">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Admin</p>
        <h1 className="text-3xl font-semibold tracking-tight">Users</h1>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Create a user</h2>
        <CreateUserForm />
      </section>

      <form className="flex flex-col gap-3 sm:flex-row" action="/admin/users">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          aria-label="Search users"
          className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <select
          name="role"
          defaultValue={role}
          aria-label="Filter by role"
          className="flex h-9 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All roles</option>
          <option value="ADMIN">Admin</option>
          <option value="MANAGER">Manager</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
        <button
          type="submit"
          className="h-9 rounded-lg border border-border px-3 text-sm font-medium"
        >
          Filter
        </button>
      </form>

      {users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users match that search.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Person</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow key={user.id} user={user} isSelf={user.id === actor.id} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function isRole(value: string | undefined): value is Role {
  return value === "ADMIN" || value === "MANAGER" || value === "EMPLOYEE";
}
