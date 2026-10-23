import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { countSearchHits, normalizeSearchQuery, type SearchResults } from "./search";

describe("search", () => {
  it("requires at least two characters and trims the query", () => {
    assert.equal(normalizeSearchQuery("a"), null);
    assert.equal(normalizeSearchQuery("  "), null);
    assert.equal(normalizeSearchQuery("  hi  "), "hi");
    assert.equal(normalizeSearchQuery("launch plan"), "launch plan");
  });

  it("counts hits across groups", () => {
    const empty: SearchResults = {
      query: "x",
      people: [],
      projects: [],
      tasks: [],
      files: [],
    };
    assert.equal(countSearchHits(empty), 0);
    assert.equal(
      countSearchHits({
        ...empty,
        people: [
          {
            type: "person",
            id: "1",
            title: "Ada",
            subtitle: "ada@x",
            href: "/chat",
          },
        ],
        tasks: [
          {
            type: "task",
            id: "t1",
            title: "Ship",
            subtitle: "P",
            href: "/tasks",
          },
        ],
      }),
      2,
    );
  });
});
