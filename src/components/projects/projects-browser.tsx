"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { CreateProjectForm } from "@/components/projects/create-project-form";
import { ProjectList, type ProjectSummary } from "@/components/projects/project-list";
import { Button } from "@/components/ui/button";
import { SurfaceCard } from "@/components/ui/page-frame";

type Filter = "all" | "active" | "archived";

export function ProjectsBrowser({
  projects,
  canCreate,
  people,
}: {
  projects: ProjectSummary[];
  canCreate: boolean;
  people: { id: string; label: string }[];
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (window.location.hash === "#new" && canCreate) {
      setCreating(true);
    }
  }, [canCreate]);

  const activeCount = projects.filter((project) => !project.archivedAt).length;
  const archivedCount = projects.length - activeCount;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return projects.filter((project) => {
      if (filter === "active" && project.archivedAt) {
        return false;
      }
      if (filter === "archived" && !project.archivedAt) {
        return false;
      }
      if (!needle) {
        return true;
      }
      const haystack = `${project.name} ${project.description ?? ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [projects, filter, query]);

  const emptyMessage =
    filter === "archived"
      ? "No archived projects."
      : filter === "active"
        ? "No active projects yet."
        : "You are not in any projects yet.";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1 self-start rounded-xl bg-muted p-1">
          {(
            [
              { id: "all", label: "All", count: projects.length },
              { id: "active", label: "Active", count: activeCount },
              { id: "archived", label: "Archived", count: archivedCount },
            ] as const
          ).map((tab) => {
            const selected = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                  selected
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[10px] font-bold ${
                    selected ? "bg-muted text-foreground" : "bg-card/80 text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="relative min-w-[12rem] flex-1 md:w-64 md:flex-none">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by keyword..."
              className="h-10 w-full rounded-lg border-0 bg-card pr-3 pl-9 text-sm shadow-sm outline-none placeholder:text-outline focus-visible:ring-2 focus-visible:ring-primary/25"
            />
          </label>
          {canCreate ? (
            <Button
              type="button"
              onClick={() => setCreating((open) => !open)}
              className="h-10 gap-1.5"
            >
              {creating ? <X className="size-4" /> : <Plus className="size-4" />}
              {creating ? "Close" : "New Project"}
            </Button>
          ) : null}
        </div>
      </div>

      {canCreate && creating ? (
        <SurfaceCard id="new" className="border border-primary/10 bg-gradient-to-br from-card to-[#f2f3ff]">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold tracking-wider text-primary uppercase">
                New workspace
              </p>
              <h2 className="mt-1 text-xl font-semibold tracking-tight">Create a project</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Name it, describe the work, and invite people you already work with.
              </p>
            </div>
          </div>
          <CreateProjectForm people={people} />
        </SurfaceCard>
      ) : null}

      <ProjectList projects={visible} empty={emptyMessage} />
    </div>
  );
}
