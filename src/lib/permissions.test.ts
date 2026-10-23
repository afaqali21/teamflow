import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Actor } from "./permissions";
import { can } from "./permissions";

const admin: Actor = { id: "admin", role: "ADMIN", isActive: true };
const manager: Actor = { id: "manager", role: "MANAGER", isActive: true };
const employee: Actor = { id: "employee", role: "EMPLOYEE", isActive: true };
const inactiveAdmin: Actor = { id: "inactive", role: "ADMIN", isActive: false };

const member = { type: "project" as const, memberRole: "MEMBER" as const };
const owner = { type: "project" as const, memberRole: "OWNER" as const };
const outsider = { type: "project" as const, memberRole: null };

describe("can", () => {
  it("denies a missing or deactivated user", () => {
    assert.equal(can(null, "users.list"), false);
    assert.equal(can(undefined, "projects.create"), false);
    assert.equal(can(inactiveAdmin, "users.list"), false);
    assert.equal(can(inactiveAdmin, "project.view", member), false);
  });

  it("lets only an active admin manage other users", () => {
    for (const actor of [admin, manager, employee]) {
      const allowed = actor.role === "ADMIN";
      assert.equal(can(actor, "users.list"), allowed);
      assert.equal(can(actor, "users.create"), allowed);
      assert.equal(can(actor, "users.update", { type: "user", userId: "other" }), allowed);
      assert.equal(
        can(actor, "users.deactivate", { type: "user", userId: "other" }),
        allowed,
      );
    }

    assert.equal(can(admin, "users.update", { type: "user", userId: admin.id }), true);
    assert.equal(
      can(admin, "users.update", { type: "user", userId: admin.id, nextRole: "EMPLOYEE" }),
      false,
    );
    assert.equal(
      can(admin, "users.deactivate", { type: "user", userId: admin.id }),
      false,
    );
    assert.equal(can(admin, "users.deactivate"), false);
  });

  it("lets any active user update only their own profile", () => {
    for (const actor of [admin, manager, employee]) {
      assert.equal(can(actor, "profile.update", { type: "user", userId: actor.id }), true);
      assert.equal(can(actor, "profile.update", { type: "user", userId: "someone-else" }), false);
    }
    assert.equal(can(inactiveAdmin, "profile.update", { type: "user", userId: inactiveAdmin.id }), false);
    assert.equal(can(employee, "profile.update"), false);
  });

  it("lets admins and managers create projects", () => {
    assert.equal(can(admin, "projects.create"), true);
    assert.equal(can(manager, "projects.create"), true);
    assert.equal(can(employee, "projects.create"), false);
  });

  it("limits project access to members, and management to owners or admins", () => {
    for (const actor of [admin, manager, employee]) {
      assert.equal(can(actor, "project.view", member), true);
      assert.equal(can(actor, "project.view", outsider), false);
      assert.equal(can(actor, "file.upload", member), true);
      assert.equal(can(actor, "file.upload", outsider), false);
    }

    assert.equal(can(admin, "project.archive", member), true);
    assert.equal(can(manager, "project.archive", member), false);
    assert.equal(can(manager, "project.manageMembers", owner), true);
    assert.equal(can(employee, "project.update", owner), true);
    assert.equal(can(employee, "project.update", member), false);
    assert.equal(can(admin, "project.archive", outsider), false);
  });

  it("lets managers assign work and employees change only their own task status", () => {
    const task = {
      type: "task" as const,
      memberRole: "MEMBER" as const,
      assigneeId: employee.id,
    };
    const unassigned = { ...task, assigneeId: null };
    const outside = { ...task, memberRole: null };

    assert.equal(can(admin, "task.create", task), true);
    assert.equal(can(manager, "task.assign", task), true);
    assert.equal(can(employee, "task.create", task), false);
    assert.equal(can(employee, "task.assign", task), false);
    assert.equal(can(manager, "task.create", outside), false);

    assert.equal(can(employee, "task.updateStatus", task), true);
    assert.equal(can(employee, "task.updateStatus", unassigned), false);
    assert.equal(can(manager, "task.updateStatus", unassigned), true);
    assert.equal(can(employee, "task.updateStatus", outside), false);
    assert.equal(can(manager, "task.update", task), true);
    assert.equal(can(employee, "task.update", task), false);
    assert.equal(can(employee, "task.comment", task), true);
    assert.equal(can(employee, "task.comment", outside), false);

    assert.equal(can(admin, "task.delete", task), true);
    assert.equal(can(manager, "task.delete", task), false);
    assert.equal(can(employee, "task.delete", task), false);
    assert.equal(can(admin, "task.delete", outside), false);
  });

  it("lets the uploader, a manager, or an admin delete a project file", () => {
    const ownFile = {
      type: "file" as const,
      memberRole: "MEMBER" as const,
      uploaderId: employee.id,
    };
    const otherFile = { ...ownFile, uploaderId: "someone-else" };

    assert.equal(can(employee, "file.delete", ownFile), true);
    assert.equal(can(employee, "file.delete", otherFile), false);
    assert.equal(can(manager, "file.delete", otherFile), true);
    assert.equal(can(admin, "file.delete", otherFile), true);
    assert.equal(can(manager, "file.delete", { ...otherFile, memberRole: null }), false);
  });

  it("lets channel members send messages and authors edit their own", () => {
    const ownMessage = {
      type: "message" as const,
      isMember: true,
      authorId: employee.id,
    };
    const otherMessage = { ...ownMessage, authorId: manager.id };

    for (const actor of [admin, manager, employee]) {
      assert.equal(can(actor, "message.send", ownMessage), true);
      assert.equal(can(actor, "message.send", { ...ownMessage, isMember: false }), false);
    }

    assert.equal(can(employee, "message.editOwn", ownMessage), true);
    assert.equal(can(employee, "message.deleteOwn", otherMessage), false);
    assert.equal(can(manager, "message.editOwn", otherMessage), true);
    assert.equal(can(employee, "message.deleteOwn", { ...ownMessage, isMember: false }), false);
  });

  it("lets any active user start a direct message with someone else", () => {
    const other = { type: "directMessage" as const, targetUserId: "alex", targetIsActive: true };
    for (const actor of [admin, manager, employee]) {
      assert.equal(can(actor, "directMessage.start", other), true);
      assert.equal(
        can(actor, "directMessage.start", { ...other, targetUserId: actor.id }),
        false,
      );
    }
    assert.equal(
      can(employee, "directMessage.start", { ...other, targetIsActive: false }),
      false,
    );
    assert.equal(can(inactiveAdmin, "directMessage.start", other), false);
    assert.equal(can(employee, "directMessage.start"), false);
  });

  it("lets someone read only their own notifications", () => {
    for (const actor of [admin, manager, employee]) {
      assert.equal(can(actor, "notification.read", { type: "notification", ownerId: actor.id }), true);
      assert.equal(can(actor, "notification.read", { type: "notification", ownerId: "someone-else" }), false);
    }
    assert.equal(
      can(inactiveAdmin, "notification.read", { type: "notification", ownerId: inactiveAdmin.id }),
      false,
    );
    assert.equal(can(employee, "notification.read"), false);
  });
});
