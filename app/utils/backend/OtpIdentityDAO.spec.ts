import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  createOtpIdentity,
  deleteOtpIdentity,
  getOtpIdentityResponse,
  updateOtpIdentity,
  type OtpIdentityResponse,
} from "~/utils/backend/OtpIdentityDAO";

/**
 * The DAO writes `${email}.cred.json` relative to the current working
 * directory. Each test runs inside a fresh tmpdir so the on-disk side effects
 * stay isolated from the repo and from other tests.
 */
describe("OtpIdentityDAO", () => {
  const TEST_EMAIL = "tester@example.com";
  let originalCwd: string;
  let tmpDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "otp-dao-"));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("getOtpIdentityResponse", () => {
    test("returns an empty list when no file exists", () => {
      const response = getOtpIdentityResponse(TEST_EMAIL);
      expect(response).toEqual({ items: [] });
    });

    test("returns parsed contents when the file exists", () => {
      const seeded: OtpIdentityResponse = {
        items: [
          { id: "abc-123", name: "Github", login: { totp: "otpauth://totp/x" } },
        ],
      };
      fs.writeFileSync(`${TEST_EMAIL}.cred.json`, JSON.stringify(seeded));

      const response = getOtpIdentityResponse(TEST_EMAIL);
      expect(response).toEqual(seeded);
    });

    test("returns an empty list when the file is corrupted JSON", () => {
      // Don't surface a parse error to the route layer; the DAO is supposed
      // to swallow it and return an empty list so the user can re-create.
      fs.writeFileSync(`${TEST_EMAIL}.cred.json`, "not-json{{{");
      expect(getOtpIdentityResponse(TEST_EMAIL)).toEqual({ items: [] });
    });

    test("namespaces by email so two users do not see each other's data", () => {
      fs.writeFileSync(
        `a@example.com.cred.json`,
        JSON.stringify({ items: [{ id: "1", name: "A", login: { totp: "x" } }] })
      );
      fs.writeFileSync(
        `b@example.com.cred.json`,
        JSON.stringify({ items: [{ id: "2", name: "B", login: { totp: "y" } }] })
      );

      expect(getOtpIdentityResponse("a@example.com").items[0].name).toBe("A");
      expect(getOtpIdentityResponse("b@example.com").items[0].name).toBe("B");
    });
  });

  describe("createOtpIdentity", () => {
    test("appends a new identity with a generated id", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=ABC" },
      });

      const response = getOtpIdentityResponse(TEST_EMAIL);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].name).toBe("Github");
      expect(response.items[0].login.totp).toContain("Github");
      // uuid v4 is 36 chars including dashes
      expect(response.items[0].id).toHaveLength(36);
    });

    test("appends to an existing list without dropping prior entries", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      await createOtpIdentity(TEST_EMAIL, {
        name: "Google",
        login: { totp: "otpauth://totp/Google?secret=B" },
      });

      const response = getOtpIdentityResponse(TEST_EMAIL);
      expect(response.items.map((item) => item.name)).toEqual([
        "Github",
        "Google",
      ]);
    });

    test("overrides any caller-supplied id with a generated uuid", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        id: "client-supplied-id",
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });

      const response = getOtpIdentityResponse(TEST_EMAIL);
      expect(response.items[0].id).not.toBe("client-supplied-id");
      expect(response.items[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    test("generates a different id for each invocation", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "A",
        login: { totp: "otpauth://totp/A?secret=A" },
      });
      await createOtpIdentity(TEST_EMAIL, {
        name: "B",
        login: { totp: "otpauth://totp/B?secret=B" },
      });

      const ids = getOtpIdentityResponse(TEST_EMAIL).items.map((i) => i.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    test("persists output as pretty-printed JSON for human inspection", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });

      const raw = fs.readFileSync(`${TEST_EMAIL}.cred.json`, "utf-8");
      // Pretty-printed output has at least one newline; a single-line dump would not.
      expect(raw).toContain("\n");
    });
  });

  describe("updateOtpIdentity", () => {
    test("merges the given fields into the matching identity", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const { items } = getOtpIdentityResponse(TEST_EMAIL);
      const id = items[0].id;

      await updateOtpIdentity(TEST_EMAIL, id, {
        name: "Github (work)",
        login: { totp: "otpauth://totp/Github?secret=Z" },
      });

      const updated = getOtpIdentityResponse(TEST_EMAIL).items[0];
      expect(updated.id).toBe(id); // id is preserved
      expect(updated.name).toBe("Github (work)");
      expect(updated.login.totp).toContain("secret=Z");
    });

    test("is a no-op when the id does not match any identity", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const before = getOtpIdentityResponse(TEST_EMAIL);

      await updateOtpIdentity(TEST_EMAIL, "no-such-id", {
        name: "Other",
        login: { totp: "otpauth://totp/Other" },
      });

      const after = getOtpIdentityResponse(TEST_EMAIL);
      expect(after).toEqual(before);
    });

    test("only mutates the matching identity, leaving siblings untouched", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      await createOtpIdentity(TEST_EMAIL, {
        name: "Google",
        login: { totp: "otpauth://totp/Google?secret=B" },
      });
      const items = getOtpIdentityResponse(TEST_EMAIL).items;
      const githubId = items[0].id;
      const googleSnapshot = { ...items[1] };

      await updateOtpIdentity(TEST_EMAIL, githubId, {
        name: "Github (work)",
        login: { totp: "otpauth://totp/Github?secret=Z" },
      });

      const after = getOtpIdentityResponse(TEST_EMAIL).items;
      expect(after.find((i) => i.id === githubId)?.name).toBe("Github (work)");
      // Sibling identity is untouched
      expect(after.find((i) => i.id === googleSnapshot.id)).toEqual(
        googleSnapshot
      );
    });
  });

  describe("deleteOtpIdentity", () => {
    test("removes the matching identity and leaves others alone", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      await createOtpIdentity(TEST_EMAIL, {
        name: "Google",
        login: { totp: "otpauth://totp/Google?secret=B" },
      });
      const idToDelete = getOtpIdentityResponse(TEST_EMAIL).items[0].id;

      await deleteOtpIdentity(TEST_EMAIL, idToDelete);

      const remaining = getOtpIdentityResponse(TEST_EMAIL);
      expect(remaining.items.map((item) => item.name)).toEqual(["Google"]);
    });

    test("is a no-op when the id does not match any identity", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const before = getOtpIdentityResponse(TEST_EMAIL);

      await deleteOtpIdentity(TEST_EMAIL, "no-such-id");

      expect(getOtpIdentityResponse(TEST_EMAIL)).toEqual(before);
    });

    test("can drain the list down to empty", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const id = getOtpIdentityResponse(TEST_EMAIL).items[0].id;

      await deleteOtpIdentity(TEST_EMAIL, id);

      expect(getOtpIdentityResponse(TEST_EMAIL).items).toHaveLength(0);
    });

    test("is safe to call against a user that has never written a file", async () => {
      // No prior create; deleteOtpIdentity must not throw.
      await expect(
        deleteOtpIdentity("brand-new@example.com", "any-id")
      ).resolves.toBeUndefined();
      // It will materialize an empty file as a side effect.
      expect(
        getOtpIdentityResponse("brand-new@example.com").items
      ).toHaveLength(0);
    });
  });

  describe("create -> update -> delete lifecycle", () => {
    test("a single record can round-trip through every operation", async () => {
      await createOtpIdentity(TEST_EMAIL, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const created = getOtpIdentityResponse(TEST_EMAIL).items[0];

      await updateOtpIdentity(TEST_EMAIL, created.id, {
        name: "Github (work)",
        login: { totp: "otpauth://totp/Github?secret=Z" },
      });
      const updated = getOtpIdentityResponse(TEST_EMAIL).items[0];
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Github (work)");

      await deleteOtpIdentity(TEST_EMAIL, created.id);
      expect(getOtpIdentityResponse(TEST_EMAIL).items).toHaveLength(0);
    });
  });
});
