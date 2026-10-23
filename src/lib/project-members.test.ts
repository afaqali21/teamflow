import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { removalBlockReason } from "./project-members";

describe("project members", () => {
  it("lets an owner remove another member", () => {
    assert.equal(removalBlockReason("MEMBER", 1), null);
    assert.equal(removalBlockReason("OWNER", 2), null);
  });

  it("refuses to remove the last owner", () => {
    assert.equal(removalBlockReason("OWNER", 1), "A project needs at least one owner.");
    assert.equal(removalBlockReason("OWNER", 0), "A project needs at least one owner.");
  });
});
