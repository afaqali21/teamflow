import type { ProjectMemberRole, Role } from "@/lib/roles";

export const actions = [
  "users.list",
  "users.create",
  "users.update",
  "users.deactivate",
  "profile.update",
  "projects.create",
  "project.view",
  "project.update",
  "project.archive",
  "project.manageMembers",
  "task.create",
  "task.assign",
  "task.updateStatus",
  "file.upload",
  "file.delete",
  "message.send",
  "message.editOwn",
  "message.deleteOwn",
] as const;

export type Action = (typeof actions)[number];

export type Actor = {
  id: string;
  role: Role;
  isActive: boolean;
};

export type Resource =
  | { type: "user"; userId: string; nextRole?: Role }
  | { type: "project"; memberRole: ProjectMemberRole | null }
  | { type: "task"; memberRole: ProjectMemberRole | null; assigneeId: string | null }
  | { type: "file"; memberRole: ProjectMemberRole | null; uploaderId: string }
  | { type: "message"; isMember: boolean; authorId: string };

function isProjectMember(memberRole: ProjectMemberRole | null): boolean {
  return memberRole === "OWNER" || memberRole === "MEMBER";
}

function canManageProject(actor: Actor, memberRole: ProjectMemberRole | null): boolean {
  return isProjectMember(memberRole) && (actor.role === "ADMIN" || memberRole === "OWNER");
}

function canLeadWork(actor: Actor, memberRole: ProjectMemberRole | null): boolean {
  return (
    isProjectMember(memberRole) && (actor.role === "ADMIN" || actor.role === "MANAGER")
  );
}

export function can(
  actor: Actor | null | undefined,
  action: Action,
  resource?: Resource,
): boolean {
  if (!actor?.isActive) {
    return false;
  }

  switch (action) {
    case "users.list":
    case "users.create":
      return actor.role === "ADMIN";
    case "users.update": {
      if (actor.role !== "ADMIN" || resource?.type !== "user") {
        return false;
      }
      const demotesSelf =
        resource.userId === actor.id &&
        resource.nextRole !== undefined &&
        resource.nextRole !== "ADMIN";
      return !demotesSelf;
    }
    case "users.deactivate":
      return (
        actor.role === "ADMIN" &&
        resource?.type === "user" &&
        resource.userId !== actor.id
      );
    case "profile.update":
      return resource?.type === "user" && resource.userId === actor.id;
    case "projects.create":
      return actor.role === "ADMIN" || actor.role === "MANAGER";
    case "project.view":
      return resource?.type === "project" && isProjectMember(resource.memberRole);
    case "project.update":
    case "project.archive":
    case "project.manageMembers":
      return resource?.type === "project" && canManageProject(actor, resource.memberRole);
    case "task.create":
    case "task.assign":
      return resource?.type === "task" && canLeadWork(actor, resource.memberRole);
    case "task.updateStatus":
      return (
        resource?.type === "task" &&
        isProjectMember(resource.memberRole) &&
        (resource.assigneeId === actor.id || canLeadWork(actor, resource.memberRole))
      );
    case "file.upload":
      return resource?.type === "project" && isProjectMember(resource.memberRole);
    case "file.delete":
      return (
        resource?.type === "file" &&
        isProjectMember(resource.memberRole) &&
        (resource.uploaderId === actor.id || canLeadWork(actor, resource.memberRole))
      );
    case "message.send":
      return resource?.type === "message" && resource.isMember;
    case "message.editOwn":
    case "message.deleteOwn":
      return (
        resource?.type === "message" &&
        resource.isMember &&
        resource.authorId === actor.id
      );
    default: {
      const unreachable: never = action;
      return unreachable;
    }
  }
}
