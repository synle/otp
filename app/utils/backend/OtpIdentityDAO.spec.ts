import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  createOtpIdentity,
  deleteOtpIdentity,
  getOtpIdentityResponse,
  sanitizeEmailForFilename,
  updateOtpIdentity,
  type OtpIdentityResponse,
  type UserKey,
} from "~/utils/backend/OtpIdentityDAO";

/**
 * The DAO writes `${email}-${provider}.cred.json` relative to the current
 * working directory. Each test runs inside a fresh tmpdir so the on-disk
 * side effects stay isolated from the repo and from other tests.
 */
describe("OtpIdentityDAO", () => {
  const TEST_EMAIL = "tester@example.com";
  const MS_KEY: UserKey = { email: TEST_EMAIL, provider: "microsoft" };
  const GOOGLE_KEY: UserKey = { email: TEST_EMAIL, provider: "google" };

  // Filename helpers — kept inline so the assertions read alongside the layout.
  const msFile = `${TEST_EMAIL}-microsoft.cred.json`;
  const googleFile = `${TEST_EMAIL}-google.cred.json`;
  const legacyFile = `${TEST_EMAIL}.cred.json`;

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

  describe("sanitizeEmailForFilename", () => {
    test("lowercases the email", () => {
      expect(sanitizeEmailForFilename("Foo@Example.COM")).toBe(
        "foo@example.com"
      );
    });

    test("trims surrounding whitespace and rejects empty input", () => {
      expect(sanitizeEmailForFilename("  a@b.com  ")).toBe("a@b.com");
      expect(() => sanitizeEmailForFilename("   ")).toThrow();
      expect(() => sanitizeEmailForFilename("")).toThrow();
    });

    test("strips path separators so the email cannot escape cwd", () => {
      // a malicious email like ../etc/passwd@x must not write outside cwd
      expect(sanitizeEmailForFilename("../etc/passwd@x.com")).toBe(
        ".._etc_passwd@x.com"
      );
      expect(sanitizeEmailForFilename("\\..\\b@x.com")).toBe("_.._b@x.com");
    });

    test("strips NUL and other control characters", () => {
      expect(sanitizeEmailForFilename("a\u0000b@x.com")).toBe("a_b@x.com");
      expect(sanitizeEmailForFilename("a\nb@x.com")).toBe("a_b@x.com");
    });

    test("is idempotent on already-sanitized input", () => {
      const once = sanitizeEmailForFilename("Mixed/Case@x.com");
      expect(sanitizeEmailForFilename(once)).toBe(once);
    });
  });

  describe("getOtpIdentityResponse", () => {
    test("returns an empty list when no file exists", () => {
      expect(getOtpIdentityResponse(MS_KEY)).toEqual({ items: [] });
    });

    test("returns parsed contents when the file exists", () => {
      const seeded: OtpIdentityResponse = {
        items: [
          { id: "abc-123", name: "Github", login: { totp: "otpauth://totp/x" } },
        ],
      };
      fs.writeFileSync(msFile, JSON.stringify(seeded));

      expect(getOtpIdentityResponse(MS_KEY)).toEqual(seeded);
    });

    test("returns an empty list when the file is corrupted JSON", () => {
      // Don't surface a parse error to the route layer; the DAO is supposed
      // to swallow it and return an empty list so the user can re-create.
      fs.writeFileSync(msFile, "not-json{{{");
      expect(getOtpIdentityResponse(MS_KEY)).toEqual({ items: [] });
    });

    test("namespaces by email so two users do not see each other's data", () => {
      fs.writeFileSync(
        `a@example.com-microsoft.cred.json`,
        JSON.stringify({ items: [{ id: "1", name: "A", login: { totp: "x" } }] })
      );
      fs.writeFileSync(
        `b@example.com-microsoft.cred.json`,
        JSON.stringify({ items: [{ id: "2", name: "B", login: { totp: "y" } }] })
      );

      expect(
        getOtpIdentityResponse({ email: "a@example.com", provider: "microsoft" })
          .items[0].name
      ).toBe("A");
      expect(
        getOtpIdentityResponse({ email: "b@example.com", provider: "microsoft" })
          .items[0].name
      ).toBe("B");
    });

    test("namespaces by provider so microsoft and google vaults are independent", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "MS only",
        login: { totp: "otpauth://totp/MS?secret=A" },
      });
      await createOtpIdentity(GOOGLE_KEY, {
        name: "Google only",
        login: { totp: "otpauth://totp/G?secret=B" },
      });

      expect(getOtpIdentityResponse(MS_KEY).items.map((i) => i.name)).toEqual([
        "MS only",
      ]);
      expect(
        getOtpIdentityResponse(GOOGLE_KEY).items.map((i) => i.name)
      ).toEqual(["Google only"]);
    });

    test("is case-insensitive on the email so MIXED@x and mixed@x share a vault", async () => {
      await createOtpIdentity(
        { email: "MiXeD@x.com", provider: "microsoft" },
        { name: "A", login: { totp: "otpauth://totp/A" } }
      );
      const lower = getOtpIdentityResponse({
        email: "mixed@x.com",
        provider: "microsoft",
      });
      expect(lower.items.map((i) => i.name)).toEqual(["A"]);
    });
  });

  describe("legacy vault migration", () => {
    test("renames `${email}.cred.json` to the new microsoft path on first read", () => {
      const seeded: OtpIdentityResponse = {
        items: [
          {
            id: "legacy-1",
            name: "Legacy",
            login: { totp: "otpauth://totp/Legacy" },
          },
        ],
      };
      fs.writeFileSync(legacyFile, JSON.stringify(seeded));

      const response = getOtpIdentityResponse(MS_KEY);

      expect(response).toEqual(seeded);
      expect(fs.existsSync(legacyFile)).toBe(false);
      expect(fs.existsSync(msFile)).toBe(true);
    });

    test("does NOT clobber the new-name file when both exist", () => {
      const legacy: OtpIdentityResponse = {
        items: [
          { id: "legacy", name: "Legacy", login: { totp: "otpauth://l" } },
        ],
      };
      const current: OtpIdentityResponse = {
        items: [
          { id: "current", name: "Current", login: { totp: "otpauth://c" } },
        ],
      };
      fs.writeFileSync(legacyFile, JSON.stringify(legacy));
      fs.writeFileSync(msFile, JSON.stringify(current));

      const response = getOtpIdentityResponse(MS_KEY);

      expect(response).toEqual(current);
      // legacy file is left untouched (we don't risk discarding data we can't
      // be sure was already migrated).
      expect(fs.existsSync(legacyFile)).toBe(true);
    });

    test("does not migrate the legacy file for the google provider", () => {
      const legacy: OtpIdentityResponse = {
        items: [
          { id: "legacy", name: "Legacy", login: { totp: "otpauth://l" } },
        ],
      };
      fs.writeFileSync(legacyFile, JSON.stringify(legacy));

      const response = getOtpIdentityResponse(GOOGLE_KEY);

      expect(response).toEqual({ items: [] });
      expect(fs.existsSync(legacyFile)).toBe(true);
      expect(fs.existsSync(googleFile)).toBe(false);
    });
  });

  describe("createOtpIdentity", () => {
    test("appends a new identity with a generated id", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=ABC" },
      });

      const response = getOtpIdentityResponse(MS_KEY);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].name).toBe("Github");
      expect(response.items[0].login.totp).toContain("Github");
      // uuid v4 is 36 chars including dashes
      expect(response.items[0].id).toHaveLength(36);
    });

    test("appends to an existing list without dropping prior entries", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      await createOtpIdentity(MS_KEY, {
        name: "Google",
        login: { totp: "otpauth://totp/Google?secret=B" },
      });

      const response = getOtpIdentityResponse(MS_KEY);
      expect(response.items.map((item) => item.name)).toEqual([
        "Github",
        "Google",
      ]);
    });

    test("overrides any caller-supplied id with a generated uuid", async () => {
      await createOtpIdentity(MS_KEY, {
        id: "client-supplied-id",
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });

      const response = getOtpIdentityResponse(MS_KEY);
      expect(response.items[0].id).not.toBe("client-supplied-id");
      expect(response.items[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
    });

    test("generates a different id for each invocation", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "A",
        login: { totp: "otpauth://totp/A?secret=A" },
      });
      await createOtpIdentity(MS_KEY, {
        name: "B",
        login: { totp: "otpauth://totp/B?secret=B" },
      });

      const ids = getOtpIdentityResponse(MS_KEY).items.map((i) => i.id);
      expect(ids[0]).not.toBe(ids[1]);
    });

    test("persists output as pretty-printed JSON for human inspection", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });

      const raw = fs.readFileSync(msFile, "utf-8");
      // Pretty-printed output has at least one newline; a single-line dump would not.
      expect(raw).toContain("\n");
    });

    test("rejects an unknown provider", async () => {
      await expect(
        createOtpIdentity(
          { email: "x@y.com", provider: "yahoo" as never },
          { name: "X", login: { totp: "otpauth://x" } }
        )
      ).rejects.toThrow(/unknown auth provider/);
    });
  });

  describe("updateOtpIdentity", () => {
    test("merges the given fields into the matching identity", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const { items } = getOtpIdentityResponse(MS_KEY);
      const id = items[0].id;

      await updateOtpIdentity(MS_KEY, id, {
        name: "Github (work)",
        login: { totp: "otpauth://totp/Github?secret=Z" },
      });

      const updated = getOtpIdentityResponse(MS_KEY).items[0];
      expect(updated.id).toBe(id); // id is preserved
      expect(updated.name).toBe("Github (work)");
      expect(updated.login.totp).toContain("secret=Z");
    });

    test("is a no-op when the id does not match any identity", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const before = getOtpIdentityResponse(MS_KEY);

      await updateOtpIdentity(MS_KEY, "no-such-id", {
        name: "Other",
        login: { totp: "otpauth://totp/Other" },
      });

      const after = getOtpIdentityResponse(MS_KEY);
      expect(after).toEqual(before);
    });

    test("only mutates the matching identity, leaving siblings untouched", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      await createOtpIdentity(MS_KEY, {
        name: "Google",
        login: { totp: "otpauth://totp/Google?secret=B" },
      });
      const items = getOtpIdentityResponse(MS_KEY).items;
      const githubId = items[0].id;
      const googleSnapshot = { ...items[1] };

      await updateOtpIdentity(MS_KEY, githubId, {
        name: "Github (work)",
        login: { totp: "otpauth://totp/Github?secret=Z" },
      });

      const after = getOtpIdentityResponse(MS_KEY).items;
      expect(after.find((i) => i.id === githubId)?.name).toBe("Github (work)");
      // Sibling identity is untouched
      expect(after.find((i) => i.id === googleSnapshot.id)).toEqual(
        googleSnapshot
      );
    });
  });

  describe("deleteOtpIdentity", () => {
    test("removes the matching identity and leaves others alone", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      await createOtpIdentity(MS_KEY, {
        name: "Google",
        login: { totp: "otpauth://totp/Google?secret=B" },
      });
      const idToDelete = getOtpIdentityResponse(MS_KEY).items[0].id;

      await deleteOtpIdentity(MS_KEY, idToDelete);

      const remaining = getOtpIdentityResponse(MS_KEY);
      expect(remaining.items.map((item) => item.name)).toEqual(["Google"]);
    });

    test("is a no-op when the id does not match any identity", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const before = getOtpIdentityResponse(MS_KEY);

      await deleteOtpIdentity(MS_KEY, "no-such-id");

      expect(getOtpIdentityResponse(MS_KEY)).toEqual(before);
    });

    test("can drain the list down to empty", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const id = getOtpIdentityResponse(MS_KEY).items[0].id;

      await deleteOtpIdentity(MS_KEY, id);

      expect(getOtpIdentityResponse(MS_KEY).items).toHaveLength(0);
    });

    test("is safe to call against a user that has never written a file", async () => {
      // No prior create; deleteOtpIdentity must not throw.
      const freshKey: UserKey = {
        email: "brand-new@example.com",
        provider: "microsoft",
      };
      await expect(
        deleteOtpIdentity(freshKey, "any-id")
      ).resolves.toBeUndefined();
      // It will materialize an empty file as a side effect.
      expect(getOtpIdentityResponse(freshKey).items).toHaveLength(0);
    });
  });

  describe("create -> update -> delete lifecycle", () => {
    test("a single record can round-trip through every operation", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const created = getOtpIdentityResponse(MS_KEY).items[0];

      await updateOtpIdentity(MS_KEY, created.id, {
        name: "Github (work)",
        login: { totp: "otpauth://totp/Github?secret=Z" },
      });
      const updated = getOtpIdentityResponse(MS_KEY).items[0];
      expect(updated.id).toBe(created.id);
      expect(updated.name).toBe("Github (work)");

      await deleteOtpIdentity(MS_KEY, created.id);
      expect(getOtpIdentityResponse(MS_KEY).items).toHaveLength(0);
    });
  });
});
