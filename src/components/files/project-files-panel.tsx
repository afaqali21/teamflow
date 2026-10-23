import { ProjectFiles } from "@/components/files/project-files";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { ProjectMemberRole } from "@/lib/roles";
import { requireUser } from "@/lib/session";

export async function ProjectFilesPanel({
  projectId,
  memberRole,
}: {
  projectId: string;
  memberRole: ProjectMemberRole | null;
}) {
  const actor = await requireUser();
  const canUpload = can(actor, "file.upload", { type: "project", memberRole });
  const rows: {
    id: string;
    name: string;
    size: number;
    mimeType: string;
    createdAt: Date;
    uploaderId: string;
    uploader: { name: string | null; email: string };
  }[] = await db.file.findMany({
    where: { projectId, status: "READY" },
    select: {
      id: true,
      name: true,
      size: true,
      mimeType: true,
      createdAt: true,
      uploaderId: true,
      uploader: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <ProjectFiles
      projectId={projectId}
      canUpload={canUpload}
      files={rows.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt.toISOString(),
        uploaderLabel: file.uploader.name?.trim() || file.uploader.email,
        canDelete: can(actor, "file.delete", {
          type: "file",
          memberRole,
          uploaderId: file.uploaderId,
        }),
      }))}
    />
  );
}
