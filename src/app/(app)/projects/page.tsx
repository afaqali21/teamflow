import { Suspense } from "react";
import { ProjectsBrowser } from "@/components/projects/projects-browser";
import { PageFrame, PageHeader } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

type ListedProject = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: Date | null;
  _count: { members: number };
};

type PersonOption = {
  id: string;
  name: string | null;
  email: string;
};

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading projects...</p>
        </PageFrame>
      }
    >
      <ProjectsPanel />
    </Suspense>
  );
}

async function ProjectsPanel() {
  const actor = await requireUser();
  const canCreate = can(actor, "projects.create");
  const [projects, people, openTaskGroups]: [
    ListedProject[],
    PersonOption[],
    { projectId: string; _count: { _all: number } }[],
  ] = await Promise.all([
    db.project.findMany({
      where: { members: { some: { userId: actor.id } } },
      select: {
        id: true,
        name: true,
        description: true,
        archivedAt: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: "asc" },
    }),
    canCreate
      ? db.user.findMany({
          where: { isActive: true, id: { not: actor.id } },
          select: { id: true, name: true, email: true },
          orderBy: [{ name: "asc" }, { email: "asc" }],
        })
      : Promise.resolve([]),
    db.task.groupBy({
      by: ["projectId"],
      where: {
        status: { not: "DONE" },
        project: { members: { some: { userId: actor.id } } },
      },
      _count: { _all: true },
    }),
  ]);

  const openByProject = new Map(
    openTaskGroups.map((row) => [row.projectId, row._count._all] as const),
  );
  const activeCount = projects.filter((project) => !project.archivedAt).length;

  return (
    <PageFrame
      wide
      crumbs={[{ label: "Dashboard", href: "/" }, { label: "Projects" }]}
    >
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description={
          projects.length === 0
            ? "Create a project to get chat, tasks, and files in one place."
            : `${activeCount} active · ${projects.length} total in your workspace`
        }
        actions={
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {projects.length} total
          </span>
        }
      />

      <ProjectsBrowser
        canCreate={canCreate}
        people={people.map((person) => ({
          id: person.id,
          label: person.name?.trim() || person.email,
        }))}
        projects={projects.map((project) => ({
          id: project.id,
          name: project.name,
          description: project.description,
          archivedAt: project.archivedAt,
          memberCount: project._count.members,
          openTaskCount: openByProject.get(project.id) ?? 0,
        }))}
      />
    </PageFrame>
  );
}
