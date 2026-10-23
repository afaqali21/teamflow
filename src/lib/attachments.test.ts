import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MAX_MESSAGE_ATTACHMENTS,
  canSendMessagePayload,
  isImageMime,
  isPdfMime,
  isPreviewableMime,
  validateAttachmentIds,
} from "./attachments";

describe("attachments", () => {
  it("recognizes previewable image and pdf types", () => {
    assert.equal(isImageMime("image/png"), true);
    assert.equal(isPdfMime("application/pdf"), true);
    assert.equal(isPreviewableMime("image/jpeg"), true);
    assert.equal(isPreviewableMime("text/plain"), false);
  });

  it("allows a message with text or files, not neither", () => {
    assert.equal(canSendMessagePayload("hi", []), true);
    assert.equal(canSendMessagePayload("", ["file1"]), true);
    assert.equal(canSendMessagePayload("  ", []), false);
  });

  it("rejects too many or duplicate file ids", () => {
    assert.equal(validateAttachmentIds(["a", "b"]), null);
    assert.equal(validateAttachmentIds(["a", "a"]), "Remove duplicate attachments.");
    const tooMany = Array.from({ length: MAX_MESSAGE_ATTACHMENTS + 1 }, (_, i) => `f${i}`);
    assert.equal(
      validateAttachmentIds(tooMany),
      `Attach up to ${MAX_MESSAGE_ATTACHMENTS} files.`,
    );
  });
});
