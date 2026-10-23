import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { directChannelKey, isUnreadMessage } from "./direct-channel";

describe("direct messages", () => {
  it("uses one key for the same two people", () => {
    assert.equal(directChannelKey("jordan", "alex"), "alex:jordan");
    assert.equal(directChannelKey("alex", "jordan"), directChannelKey("jordan", "alex"));
    assert.equal(directChannelKey("alex", "alex"), null);
    assert.equal(directChannelKey("", "alex"), null);
  });

  it("counts another person's message after lastReadAt as unread", () => {
    const earlier = new Date("2026-10-21T09:00:00.000Z");
    const readAt = new Date("2026-10-21T10:00:00.000Z");
    const later = new Date("2026-10-21T11:00:00.000Z");
    const fromOther = { authorId: "alex", createdAt: later, deletedAt: null };

    assert.equal(isUnreadMessage(fromOther, "jordan", readAt), true);
    assert.equal(isUnreadMessage(fromOther, "jordan", null), true);
    assert.equal(isUnreadMessage({ ...fromOther, createdAt: earlier }, "jordan", readAt), false);
    assert.equal(isUnreadMessage({ ...fromOther, createdAt: readAt }, "jordan", readAt), false);
    assert.equal(isUnreadMessage({ ...fromOther, authorId: "jordan" }, "jordan", null), false);
    assert.equal(isUnreadMessage({ ...fromOther, deletedAt: later }, "jordan", null), false);
  });
});
