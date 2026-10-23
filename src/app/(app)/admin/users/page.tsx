import { Suspense } from "react";
import Link from "next/link";
import { AdminNav } from "@/components/admin/admin-nav";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRow } from "@/components/admin/user-row";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Role } from "@/lib/roles";
import { requireUser } from "@/lib/session";

type ListedUser = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  isActive: boolean;
};

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
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading users...</p>
        </PageFrame>
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
      <PageFrame>
        <SurfaceCard className="mx-auto max-w-lg text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You do not have permission to manage users.
          </p>
          <Link href="/" className="mt-6 inline-block text-sm font-medium text-primary hover:underline">
            Back home
          </Link>
        </SurfaceCard>
      </PageFrame>
    );
  }

  const q = query.q?.trim() ?? "";
  const role = isRole(query.role) ? query.role : "";
  const users: ListedUser[] = await db.user.findMany({
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
    <PageFrame
      wide
      crumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Admin", href: "/admin" },
        { label: "Users" },
      ]}
    >
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Invite people, change roles, and deactivate accounts."
        actions={
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {users.length} shown
          </span>
        }
      />

      <AdminNav pathname="/admin/users" />

      <SurfaceCard>
        <h2 className="mb-3 text-lg font-semibold">Create a user</h2>
        <CreateUserForm />
      </SurfaceCard>

      <SurfaceCard>
        <form className="mb-4 flex flex-col gap-3 sm:flex-row" action="/admin/users">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
            aria-label="Search users"
            className="flex h-10 w-full rounded-lg border-0 bg-surface-low px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          />
          <select
            name="role"
            defaultValue={role}
            aria-label="Filter by role"
            className="flex h-10 rounded-lg border-0 bg-surface-low px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          >
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="MANAGER">Manager</option>
            <option value="EMPLOYEE">Employee</option>
          </select>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
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
      </SurfaceCard>
    </PageFrame>
  );
}

function isRole(value: string | undefined): value is Role {
  return value === "ADMIN" || value === "MANAGER" || value === "EMPLOYEE";
}
