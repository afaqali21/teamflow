import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LoginUser } from "./login";
import { verifyLogin } from "./login";

const activeUser: LoginUser = {
  id: "user-1",
  name: "Avery Admin",
  email: "admin@teamflow.local",
  passwordHash: "hash",
  role: "ADMIN",
  isActive: true,
};

function findUser(user: LoginUser | null) {
  return async (email: string) => (user && user.email === email ? user : null);
}

describe("verifyLogin", () => {
  it("returns the user id and role for a valid active account", async () => {
    const result = await verifyLogin(
      { email: "Admin@teamflow.local", password: "Password123!" },
      findUser(activeUser),
      async () => true,
    );

    assert.deepEqual(result, {
      id: "user-1",
      name: "Avery Admin",
      email: "admin@teamflow.local",
      role: "ADMIN",
    });
  });

  it("rejects a deactivated user", async () => {
    const result = await verifyLogin(
      { email: activeUser.email, password: "Password123!" },
      findUser({ ...activeUser, isActive: false }),
      async () => true,
    );

    assert.equal(result, null);
  });

  it("rejects a wrong password and an unknown email", async () => {
    const wrongPassword = await verifyLogin(
      { email: activeUser.email, password: "nope" },
      findUser(activeUser),
      async () => false,
    );
    const unknown = await verifyLogin(
      { email: "missing@teamflow.local", password: "Password123!" },
      findUser(activeUser),
      async () => true,
    );

    assert.equal(wrongPassword, null);
    assert.equal(unknown, null);
  });

  it("rejects empty credentials", async () => {
    const result = await verifyLogin({}, findUser(activeUser), async () => true);
    assert.equal(result, null);
  });
});
