import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTaskStatus, matchesDue, taskBucket } from "./task-filters";

describe("task filters", () => {
  const now = new Date("2026-10-21T15:00:00.000Z");

  it("keeps overdue, today, and undated tasks apart", () => {
    const yesterday = new Date("2026-10-20T00:00:00.000Z");
    const today = new Date("2026-10-21T00:00:00.000Z");
    const nextWeek = new Date("2026-10-28T00:00:00.000Z");

    assert.equal(matchesDue(yesterday, "overdue", now), true);
    assert.equal(matchesDue(today, "overdue", now), false);
    assert.equal(matchesDue(null, "overdue", now), false);
    assert.equal(matchesDue(today, "today", now), true);
    assert.equal(matchesDue(yesterday, "today", now), false);
    assert.equal(matchesDue(today, "week", now), true);
    assert.equal(matchesDue(nextWeek, "week", now), false);
    assert.equal(matchesDue(null, "none", now), true);
    assert.equal(matchesDue(today, "none", now), false);
    assert.equal(matchesDue(nextWeek, "all", now), true);
    assert.equal(taskBucket(yesterday, now), "overdue");
    assert.equal(taskBucket(today, now), "today");
    assert.equal(taskBucket(new Date("2026-10-24T00:00:00.000Z"), now), "week");
    assert.equal(taskBucket(nextWeek, now), "later");
    assert.equal(taskBucket(null, now), "later");
  });

  it("rejects a status an employee cannot invent", () => {
    assert.equal(isTaskStatus("DONE"), true);
    assert.equal(isTaskStatus("ARCHIVED"), false);
  });
});
