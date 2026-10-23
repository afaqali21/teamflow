import { Suspense } from "react";
import Link from "next/link";
import { File as FileGlyph, Paperclip } from "lucide-react";
import { LibraryDownloadButton } from "@/components/files/library-download-button";
import { PageFrame, PageHeader, SurfaceCard } from "@/components/ui/page-frame";
import { db } from "@/lib/db";
import { formatFileSize } from "@/lib/project-files";
import { requireUser } from "@/lib/session";

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <PageFrame>
          <p className="text-sm text-muted-foreground">Loading files...</p>
        </PageFrame>
      }
    >
      <FilesPanel />
    </Suspense>
  );
}

async function FilesPanel() {
  const actor = await requireUser();
  const files: {
    id: string;
    name: string;
    size: number;
    createdAt: Date;
    project: { id: string; name: string };
    uploader: { name: string | null; email: string };
  }[] = await db.file.findMany({
    where: {
      status: "READY",
      project: { members: { some: { userId: actor.id } } },
    },
    select: {
      id: true,
      name: true,
      size: true,
      createdAt: true,
      project: { select: { id: true, name: true } },
      uploader: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <PageFrame crumbs={[{ label: "Dashboard", href: "/" }, { label: "Files" }]}>
      <PageHeader
        title="Files"
        description="Ready files from projects you belong to."
        actions={
          <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
            {files.length} shown
          </span>
        }
      />

      {files.length === 0 ? (
        <SurfaceCard className="flex flex-col items-start gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-[#e2dfff] text-primary">
            <Paperclip className="size-6" />
          </span>
          <h2 className="text-lg font-semibold">No files yet</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Open a project and use its Files tab to upload. The bucket stays private; downloads use
            short-lived links.
          </p>
        </SurfaceCard>
      ) : (
        <SurfaceCard className="p-0 md:p-0">
          <ul className="divide-y divide-border/60">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#e2dfff] text-primary">
                    <FileGlyph className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFileSize(file.size)} · {file.uploader.name?.trim() || file.uploader.email}{" "}
                      ·{" "}
                      <Link
                        href={`/projects/${file.project.id}?tab=files`}
                        className="font-medium text-primary hover:underline"
                      >
                        {file.project.name}
                      </Link>
                    </p>
                  </div>
                </div>
                <LibraryDownloadButton fileId={file.id} />
              </li>
            ))}
          </ul>
        </SurfaceCard>
      )}
    </PageFrame>
  );
}
