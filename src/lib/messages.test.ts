import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  channelIdFromPusherName,
  MESSAGE_PAGE_SIZE,
  pusherChannelName,
  sliceNewestPage,
} from "./message-page";
import { can } from "./permissions";
import { readLiveMessage, removeMessage, upsertMessage } from "./chat-message";

describe("chat messages", () => {
  it("names a private channel and keeps the newest page", () => {
    assert.equal(pusherChannelName("channel-1"), "private-channel-channel-1");
    assert.equal(channelIdFromPusherName("private-channel-channel-1"), "channel-1");
    assert.equal(MESSAGE_PAGE_SIZE, 30);

    const rows = Array.from({ length: 31 }, (_, index) => ({ id: `m${index}` }));
    const page = sliceNewestPage(rows);
    assert.equal(page.messages.length, 30);
    assert.equal(page.messages[0]?.id, "m0");
    assert.equal(page.nextCursor, "m29");
  });

  it("rejects a public channel name and a non-member", () => {
    assert.equal(channelIdFromPusherName("channel-1"), null);
    assert.equal(channelIdFromPusherName("private-channel-"), null);
    assert.equal(channelIdFromPusherName("private-channel-bad id"), null);
    const employee = { id: "employee", role: "EMPLOYEE" as const, isActive: true };
    assert.equal(
      can(employee, "message.send", { type: "message", isMember: false, authorId: "employee" }),
      false,
    );
    assert.equal(
      can(employee, "message.editOwn", { type: "message", isMember: true, authorId: "someone-else" }),
      false,
    );
    assert.equal(
      can(employee, "message.deleteOwn", { type: "message", isMember: true, authorId: "someone-else" }),
      false,
    );
  });

  it("keeps one copy of a live message and ignores a bad payload", () => {
    const first = {
      id: "m1",
      body: "Hello",
      createdAt: "2026-10-21T00:00:00.000Z",
      attachments: [] as { id: string; fileId: string; name: string; mimeType: string; size: number }[],
      author: { id: "a", name: "Ada", email: "ada@teamflow.local", avatarUrl: null },
    };
    const edited = { ...first, body: "Hello there" };
    assert.equal(upsertMessage([first], edited)[0]?.body, "Hello there");
    assert.equal(upsertMessage([first], edited).length, 1);
    assert.equal(removeMessage([first], "m1").length, 0);
    assert.equal(readLiveMessage({ id: "m1" }), null);
    assert.equal(readLiveMessage(edited)?.body, "Hello there");
    assert.deepEqual(readLiveMessage(edited)?.attachments, []);
    assert.equal(
      readLiveMessage({
        ...edited,
        attachments: [
          {
            id: "att1",
            fileId: "f1",
            name: "spec.pdf",
            mimeType: "application/pdf",
            size: 1200,
          },
        ],
      })?.attachments[0]?.name,
      "spec.pdf",
    );
  });
});
