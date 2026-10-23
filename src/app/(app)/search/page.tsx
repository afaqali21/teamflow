import { Suspense } from "react";
import Link from "next/link";
import { File as FileGlyph, FolderOpen, Search, SquareCheckBig, UserRound } from "lucide-react";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import {
  countSearchHits,
  normalizeSearchQuery,
  searchWorkspace,
  type SearchHit,
} from "@/lib/search";
import { requireUser } from "@/lib/session";

type SearchQuery = { q?: string };

export default function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchQuery>;
}) {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Searching...</p>
        </PageFrame>
      }
    >
      <SearchPanel searchParams={searchParams} />
    </Suspense>
  );
}

async function SearchPanel({ searchParams }: { searchParams: Promise<SearchQuery> }) {
  const actor = await requireUser();
  const raw = (await searchParams).q ?? "";
  const normalized = normalizeSearchQuery(raw);
  const results = normalized ? await searchWorkspace(actor, normalized) : null;
  const total = results ? countSearchHits(results) : 0;

  return (
    <PageFrame crumbs={[{ label: "Dashboard", href: "/" }, { label: "Search" }]}>
      <PageHeader
        title="Search"
        description="Find people, projects, tasks, and files you can access."
      />

      <SurfaceCard>
        <form action="/search" className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q"
              type="search"
              defaultValue={raw}
              autoFocus
              minLength={2}
              placeholder="Search tasks, projects, people, files..."
              className="h-10 w-full rounded-lg border-0 bg-surface-low pr-3 pl-10 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
            />
          </label>
          <button
            type="submit"
            className="h-10 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>
        </form>
        {!normalized && raw.trim().length > 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Enter at least 2 characters.</p>
        ) : null}
      </SurfaceCard>

      {results ? (
        total === 0 ? (
          <SurfaceCard>
            <p className="text-sm text-muted-foreground">
              No results for “{results.query}” that you can access.
            </p>
          </SurfaceCard>
        ) : (
          <div className="flex flex-col gap-6">
            <ResultGroup title="People" icon={<UserRound className="size-4" />} hits={results.people} />
            <ResultGroup title="Projects" icon={<FolderOpen className="size-4" />} hits={results.projects} />
            <ResultGroup title="Tasks" icon={<SquareCheckBig className="size-4" />} hits={results.tasks} />
            <ResultGroup title="Files" icon={<FileGlyph className="size-4" />} hits={results.files} />
          </div>
        )
      ) : (
        <SurfaceCard className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">
            Type a query above. Results only include items from projects you belong to (and people you
            are allowed to see).
          </p>
        </SurfaceCard>
      )}
    </PageFrame>
  );
}

function ResultGroup({
  title,
  icon,
  hits,
}: {
  title: string;
  icon: React.ReactNode;
  hits: SearchHit[];
}) {
  if (hits.length === 0) {
    return null;
  }
  return (
    <SurfaceCard className="flex flex-col gap-3 p-0 md:p-0">
      <div className="flex items-center gap-2 border-b border-border/60 px-5 py-3 md:px-6">
        <span className="text-primary">{icon}</span>
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {hits.length}
        </span>
      </div>
      <ul className="divide-y divide-border/50">
        {hits.map((hit) => (
          <li key={`${hit.type}-${hit.id}`}>
            <Link
              href={hit.href}
              className="block px-5 py-3 transition-colors hover:bg-surface-low md:px-6"
            >
              <p className="font-medium">{hit.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{hit.subtitle}</p>
            </Link>
          </li>
        ))}
      </ul>
    </SurfaceCard>
  );
}
