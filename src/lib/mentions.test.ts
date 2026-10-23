import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mentionedUserIds, newlyMentioned } from "./mentions";
import { userChannelName, userIdFromPusherName } from "./user-channel";

const alex = { id: "alex", name: "Alex Rivera", email: "alex@teamflow.local" };
const jordan = { id: "jordan", name: "Jordan Lee", email: "jordan@teamflow.local" };
const short = { id: "al", name: "Alex", email: "al@teamflow.local" };

describe("mentions", () => {
  it("matches a member by name or email once", () => {
    const people = [alex, jordan];
    assert.deepEqual(mentionedUserIds("Hey @Jordan Lee, can you review?", people), ["jordan"]);
    assert.deepEqual(mentionedUserIds("See @alex@teamflow.local and @Alex Rivera", people), [
      "alex",
    ]);
    assert.deepEqual(mentionedUserIds("@Jordan Lee @jordan lee", people), ["jordan"]);
  });

  it("ignores a shorter name inside a longer one and addresses outside the channel", () => {
    assert.deepEqual(mentionedUserIds("@Alex Rivera", [alex, short]), ["alex"]);
    assert.deepEqual(mentionedUserIds("mail foo@jordan@teamflow.local", [jordan]), []);
    assert.deepEqual(mentionedUserIds("@Alex", [alex]), []);
    assert.deepEqual(newlyMentioned("Hi @Jordan Lee", "@Jordan Lee and @Alex Rivera", [alex, jordan]), [
      "alex",
    ]);
  });

  it("names a private user channel and rejects a chat channel", () => {
    assert.equal(userChannelName("user_1"), "private-user-user_1");
    assert.equal(userIdFromPusherName("private-user-user_1"), "user_1");
    assert.equal(userIdFromPusherName("private-channel-user_1"), null);
    assert.equal(userIdFromPusherName("private-user-"), null);
    assert.equal(userIdFromPusherName("private-user-bad id"), null);
  });
});
