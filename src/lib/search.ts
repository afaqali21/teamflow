import { db } from "@/lib/db";
import type { Actor } from "@/lib/permissions";
import { can } from "@/lib/permissions";

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_LIMIT_PER_GROUP = 8;

export type SearchHit = {
  type: "person" | "project" | "task" | "file";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

export type SearchResults = {
  query: string;
  people: SearchHit[];
  projects: SearchHit[];
  tasks: SearchHit[];
  files: SearchHit[];
};

export function normalizeSearchQuery(raw: string): string | null {
  const query = raw.trim().replace(/\s+/g, " ");
  if (query.length < SEARCH_MIN_LENGTH) {
    return null;
  }
  return query.slice(0, 80);
}

export async function searchWorkspace(actor: Actor, rawQuery: string): Promise<SearchResults> {
  const query = normalizeSearchQuery(rawQuery);
  if (!query) {
    return { query: rawQuery.trim(), people: [], projects: [], tasks: [], files: [] };
  }

  const isAdmin = can(actor, "users.list");
  const memberships: { projectId: string }[] = await db.projectMember.findMany({
    where: { userId: actor.id },
    select: { projectId: true },
  });
  const projectIds = memberships.map((row) => row.projectId);

  const [people, projects, tasks, files] = await Promise.all([
    db.user.findMany({
      where: {
        ...(isAdmin ? {} : { isActive: true }),
        OR: [
          { name: { contains: query, mode: "insensitive" } },
          { email: { contains: query, mode: "insensitive" } },
        ],
      },
      select: { id: true, name: true, email: true, role: true, isActive: true },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      take: SEARCH_LIMIT_PER_GROUP,
    }),
    projectIds.length === 0
      ? Promise.resolve([])
      : db.project.findMany({
          where: {
            id: { in: projectIds },
            OR: [
              { name: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          select: { id: true, name: true, description: true, archivedAt: true },
          orderBy: { name: "asc" },
          take: SEARCH_LIMIT_PER_GROUP,
        }),
    projectIds.length === 0
      ? Promise.resolve([])
      : db.task.findMany({
          where: {
            projectId: { in: projectIds },
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { description: { contains: query, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            title: true,
            status: true,
            projectId: true,
            project: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: SEARCH_LIMIT_PER_GROUP,
        }),
    projectIds.length === 0
      ? Promise.resolve([])
      : db.file.findMany({
          where: {
            projectId: { in: projectIds },
            status: "READY",
            name: { contains: query, mode: "insensitive" },
          },
          select: {
            id: true,
            name: true,
            mimeType: true,
            projectId: true,
            project: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: SEARCH_LIMIT_PER_GROUP,
        }),
  ]);

  return {
    query,
    people: people.map((person) => ({
      type: "person" as const,
      id: person.id,
      title: person.name?.trim() || person.email,
      subtitle: `${person.email}${person.isActive ? "" : " · inactive"} · ${person.role}`,
      href: isAdmin ? `/admin/users?q=${encodeURIComponent(person.email)}` : "/chat",
    })),
    projects: projects.map((project) => ({
      type: "project" as const,
      id: project.id,
      title: project.name,
      subtitle: project.archivedAt
        ? "Archived project"
        : project.description?.trim() || "Project",
      href: `/projects/${project.id}`,
    })),
    tasks: tasks.map((task) => ({
      type: "task" as const,
      id: task.id,
      title: task.title,
      subtitle: `${task.project.name} · ${task.status.replaceAll("_", " ")}`,
      href: `/projects/${task.projectId}/tasks/${task.id}`,
    })),
    files: files.map((file) => ({
      type: "file" as const,
      id: file.id,
      title: file.name,
      subtitle: `${file.project.name} · ${file.mimeType}`,
      href: `/projects/${file.projectId}?tab=files`,
    })),
  };
}

export function countSearchHits(results: SearchResults): number {
  return (
    results.people.length +
    results.projects.length +
    results.tasks.length +
    results.files.length
  );
}
