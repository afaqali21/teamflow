import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PASSWORD_TOKEN_TTL_MS,
  createPasswordToken,
  emailFromPasswordTokenIdentifier,
  hashPasswordToken,
  isPasswordTokenExpired,
  passwordTokenIdentifier,
} from "./password-token";

describe("password tokens", () => {
  it("expires 48 hours after it is created", () => {
    const now = Date.parse("2026-10-20T00:00:00.000Z");
    const created = createPasswordToken(now);

    assert.equal(created.expires.getTime() - now, PASSWORD_TOKEN_TTL_MS);
    assert.equal(PASSWORD_TOKEN_TTL_MS, 48 * 60 * 60 * 1000);
    assert.equal(isPasswordTokenExpired(created.expires, now + PASSWORD_TOKEN_TTL_MS - 1), false);
    assert.equal(isPasswordTokenExpired(created.expires, now + PASSWORD_TOKEN_TTL_MS), true);
  });

  it("stores a hash instead of the raw token", () => {
    const created = createPasswordToken();

    assert.notEqual(created.tokenHash, created.token);
    assert.equal(created.tokenHash, hashPasswordToken(created.token));
    assert.equal(
      emailFromPasswordTokenIdentifier(passwordTokenIdentifier("Admin@teamflow.local")),
      "admin@teamflow.local",
    );
    assert.equal(emailFromPasswordTokenIdentifier("other:value"), null);
  });
});
