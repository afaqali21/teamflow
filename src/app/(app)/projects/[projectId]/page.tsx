import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProjectChat } from "@/components/chat/project-chat";
import { ProjectFilesPanel } from "@/components/files/project-files-panel";
import { AddMemberForm } from "@/components/projects/add-member-form";
import { ArchiveProjectForm } from "@/components/projects/archive-project-form";
import { MemberRow } from "@/components/projects/member-row";
import { ProjectTasks } from "@/components/tasks/project-tasks";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import { removalBlockReason } from "@/lib/project-members";
import { requireUser } from "@/lib/session";

const tabs = [
  { id: "chat", label: "Chat" },
  { id: "tasks", label: "Tasks" },
  { id: "files", label: "Files" },
  { id: "people", label: "People" },
] as const;

type ProjectTab = (typeof tabs)[number]["id"];

type ProjectQuery = {
  tab?: string;
  status?: string;
  assignee?: string;
  due?: string;
  view?: string;
};

type ProjectPerson = {
  id: string;
  name: string | null;
  email: string;
  isActive: boolean;
};

type ProjectDetails = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: Date | null;
  members: { role: "OWNER" | "MEMBER"; user: ProjectPerson }[];
};

export default function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<ProjectQuery>;
}) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-6 py-10">
          <p className="text-sm text-muted-foreground">Loading project...</p>
        </main>
      }
    >
      <ProjectPanel params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ProjectPanel({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<ProjectQuery>;
}) {
  const actor = await requireUser();
  const { projectId } = await params;
  const query = await searchParams;
  const tab = parseTab(query.tab);

  const project: ProjectDetails | null = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      description: true,
      archivedAt: true,
      members: {
        select: {
          role: true,
          user: { select: { id: true, name: true, email: true, isActive: true } },
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  const membership = project?.members.find((member) => member.user.id === actor.id) ?? null;
  const resource = {
    type: "project" as const,
    memberRole: membership?.role === "OWNER" || membership?.role === "MEMBER" ? membership.role : null,
  };
  if (!project || !can(actor, "project.view", resource)) {
    notFound();
  }

  const canManage = can(actor, "project.manageMembers", resource);
  const canArchive = can(actor, "project.archive", resource);
  const ownerCount = project.members.filter((member) => member.role === "OWNER").length;
  const candidates: { id: string; name: string | null; email: string }[] = canManage
    ? await db.user.findMany({
        where: {
          isActive: true,
          id: { notIn: project.members.map((member) => member.user.id) },
        },
        select: { id: true, name: true, email: true },
        orderBy: [{ name: "asc" }, { email: "asc" }],
      })
    : [];

  const tabLabel = tabs.find((item) => item.id === tab)?.label ?? "People";

  return (
    <PageFrame
      wide={tab === "tasks" || tab === "chat" || tab === "files"}
      crumbs={[
        { label: "Dashboard", href: "/" },
        { label: "Projects", href: "/projects" },
        { label: project.name, href: `/projects/${project.id}` },
        { label: tabLabel },
      ]}
    >
      <PageHeader
        eyebrow="Project"
        title={project.name}
        description={
          <>
            {project.description ? <p>{project.description}</p> : null}
            {project.archivedAt ? <p className="mt-1 font-medium">Archived</p> : null}
            <p className="mt-1">{project.members.length} members</p>
          </>
        }
        actions={
          <div className="flex flex-col items-start gap-3">
            {can(actor, "projects.create") ? (
              <Link href="/projects#new" className="text-sm font-medium text-primary hover:underline">
                Create a project
              </Link>
            ) : null}
            {canArchive ? (
              <ArchiveProjectForm projectId={project.id} archived={Boolean(project.archivedAt)} />
            ) : null}
          </div>
        }
      />

      <nav className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {tabs.map((item) => {
          const active = item.id === tab;
          return (
            <Link
              key={item.id}
              href={
                item.id === "people"
                  ? `/projects/${project.id}`
                  : `/projects/${project.id}?tab=${item.id}`
              }
              aria-current={active ? "page" : undefined}
              className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-card font-medium text-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {tab === "chat" ? (
        <SurfaceCard>
          <ProjectChat projectId={project.id} />
        </SurfaceCard>
      ) : null}
      {tab === "tasks" ? (
        <ProjectTasks
          projectId={project.id}
          members={project.members.map((member) => ({
            id: member.user.id,
            label: member.user.name?.trim() || member.user.email,
            isActive: member.user.isActive,
            role: member.role,
          }))}
          status={query.status}
          assignee={query.assignee}
          due={query.due}
          view={query.view}
        />
      ) : null}
      {tab === "files" ? (
        <SurfaceCard>
          <ProjectFilesPanel projectId={project.id} memberRole={resource.memberRole} />
        </SurfaceCard>
      ) : null}
      {tab === "people" ? (
        <SurfaceCard className="space-y-6">
          {canManage ? (
            <AddMemberForm
              projectId={project.id}
              people={candidates.map((person) => ({
                id: person.id,
                label: person.name?.trim() || person.email,
              }))}
            />
          ) : null}
          <ul>
            {project.members.map((member) => (
              <MemberRow
                key={member.user.id}
                projectId={project.id}
                userId={member.user.id}
                name={member.user.name?.trim() || member.user.email}
                email={member.user.email}
                role={member.role}
                canRemove={
                  canManage &&
                  removalBlockReason(
                    member.role === "OWNER" ? "OWNER" : "MEMBER",
                    ownerCount,
                  ) === null
                }
              />
            ))}
          </ul>
        </SurfaceCard>
      ) : null}
    </PageFrame>
  );
}

function parseTab(value: string | undefined): ProjectTab {
  if (value === "chat" || value === "tasks" || value === "files") {
    return value;
  }
  return "people";
}
