import { db } from "@/lib/db";
import {
  createPasswordToken,
  emailFromPasswordTokenIdentifier,
  hashPasswordToken,
  isPasswordTokenExpired,
  passwordTokenIdentifier,
} from "@/lib/password-token";

export async function issuePasswordToken(email: string) {
  const identifier = passwordTokenIdentifier(email);
  const created = createPasswordToken();

  await db.verificationToken.deleteMany({ where: { identifier } });
  await db.verificationToken.create({
    data: {
      identifier,
      token: created.tokenHash,
      expires: created.expires,
    },
  });

  return created.token;
}

export async function consumePasswordToken(rawToken: string) {
  const tokenHash = hashPasswordToken(rawToken);
  const record = await db.verificationToken.findUnique({ where: { token: tokenHash } });

  if (!record || isPasswordTokenExpired(record.expires)) {
    if (record) {
      await db.verificationToken.delete({ where: { token: tokenHash } });
    }
    return null;
  }

  const email = emailFromPasswordTokenIdentifier(record.identifier);
  if (!email) {
    await db.verificationToken.delete({ where: { token: tokenHash } });
    return null;
  }

  await db.verificationToken.delete({ where: { token: tokenHash } });
  return email;
}
