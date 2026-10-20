import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVATAR_MAX_BYTES, createAvatarKey, isOwnAvatarKey, validateAvatarUpload } from "./avatar";

const userId = "user_123";

describe("avatar uploads", () => {
  it("accepts an image within 2 MB and rejects anything else", () => {
    assert.equal(validateAvatarUpload({ size: 1024, mimeType: "image/png" }), null);
    assert.equal(
      validateAvatarUpload({ size: AVATAR_MAX_BYTES + 1, mimeType: "image/jpeg" }),
      "Images must be 2 MB or smaller.",
    );
    assert.equal(
      validateAvatarUpload({ size: 1024, mimeType: "application/pdf" }),
      "Use a JPEG, PNG, WebP, or GIF.",
    );
    assert.equal(validateAvatarUpload({ size: 0, mimeType: "image/gif" }), "Choose an image to upload.");
  });

  it("accepts only a key stored for that user", () => {
    const key = createAvatarKey(userId, "image/webp", "abcdefghijklmnop");
    assert.equal(key, "avatars/user_123/abcdefghijklmnop.webp");
    assert.equal(isOwnAvatarKey(userId, key ?? ""), true);
    assert.equal(isOwnAvatarKey("other-user", key ?? ""), false);
    assert.equal(isOwnAvatarKey(userId, "avatars/user_123/../secret.png"), false);
    assert.equal(isOwnAvatarKey(userId, "avatars/user_123/short.png"), false);
  });
});
