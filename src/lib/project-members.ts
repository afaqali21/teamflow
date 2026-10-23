import type { ProjectMemberRole } from "@/lib/roles";

export function removalBlockReason(
  memberRole: ProjectMemberRole,
  ownerCount: number,
): string | null {
  if (memberRole === "OWNER" && ownerCount <= 1) {
    return "A project needs at least one owner.";
  }
  return null;
}
