import Link from "next/link";
import { CheckSquare, FolderOpen, Users } from "lucide-react";
import { SurfaceCard } from "@/components/ui/page-frame";

export type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  archivedAt: Date | null;
  memberCount?: number;
  openTaskCount?: number;
};

export function ProjectList({
  projects,
  empty,
}: {
  projects: ProjectSummary[];
  empty: string;
}) {
  if (projects.length === 0) {
    return (
      <SurfaceCard className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e2dfff] text-primary">
          <FolderOpen className="size-6" />
        </span>
        <p className="text-sm text-muted-foreground">{empty}</p>
      </SurfaceCard>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id}>
          <Link href={`/projects/${project.id}`} className="group block h-full">
            <SurfaceCard className="flex h-full flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-[#e2dfff] text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <FolderOpen className="size-5" />
                </span>
                {project.archivedAt ? (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    Archived
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#85f8c4]/35 px-2.5 py-1 text-[11px] font-semibold text-secondary">
                    <span className="size-1.5 rounded-full bg-secondary" />
                    Active
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-1.5">
                <p className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                  {project.name}
                </p>
                {project.description ? (
                  <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {project.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">No description yet</p>
                )}
              </div>

              <div className="mt-auto flex items-center gap-4 border-t border-border/50 pt-3 text-xs font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="size-3.5" />
                  {project.memberCount ?? 0}{" "}
                  {(project.memberCount ?? 0) === 1 ? "member" : "members"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckSquare className="size-3.5" />
                  {project.openTaskCount ?? 0} open
                </span>
              </div>
            </SurfaceCard>
          </Link>
        </li>
      ))}
    </ul>
  );
}
