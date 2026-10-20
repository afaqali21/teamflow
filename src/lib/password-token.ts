import { createHash, randomBytes } from "node:crypto";

export const PASSWORD_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

export function passwordTokenIdentifier(email: string) {
  return `password:${email.toLowerCase()}`;
}

export function emailFromPasswordTokenIdentifier(identifier: string) {
  const prefix = "password:";
  if (!identifier.startsWith(prefix)) {
    return null;
  }
  const email = identifier.slice(prefix.length);
  return email.includes("@") ? email : null;
}

export function hashPasswordToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createPasswordToken(now = Date.now()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashPasswordToken(token),
    expires: new Date(now + PASSWORD_TOKEN_TTL_MS),
  };
}

export function isPasswordTokenExpired(expires: Date, now = Date.now()) {
  return expires.getTime() <= now;
}
