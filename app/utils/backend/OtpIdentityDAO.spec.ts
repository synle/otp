import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  _resetForTests,
  createOtpIdentity,
  deleteOtpIdentity,
  getOtpIdentityResponse,
  sanitizeEmailForFilename,
  updateOtpIdentity,
  type OtpIdentityResponse,
  type UserKey,
} from "~/utils/backend/OtpIdentityDAO";

/**
 * The DAO opens an `otp.db` SQLite file relative to `process.cwd()`. Each
 * test gets a fresh tmpdir so connections, schemas, and on-disk state are
 * fully isolated. `_resetForTests` drops cached connections from the prior
 * tmpdir so we don't leak file descriptors across tests.
 */
describe("OtpIdentityDAO", () => {
  const TEST_EMAIL = "tester@example.com";
  const MS_KEY: UserKey = { email: TEST_EMAIL, provider: "microsoft" };
  const GOOGLE_KEY: UserKey = { email: TEST_EMAIL, provider: "google" };

  // Pre-multi-provider layout used a single per-email file; post-Phase-1
  // layout namespaces by provider. SQLite migration accepts both.
  const newLayoutFile = `${TEST_EMAIL}-microsoft.cred.json`;
  const legacyLayoutFile = `${TEST_EMAIL}.cred.json`;

  let originalCwd: string;
  let tmpDir: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "otp-dao-"));
    process.chdir(tmpDir);
  });

  afterEach(() => {
    _resetForTests();
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

    test("strips path separators so the email cannot escape cwd at migration time", () => {
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
    test("returns an empty list for a brand-new user", () => {
      expect(getOtpIdentityResponse(MS_KEY)).toEqual({ items: [] });
    });

    test("creates the otp.db file lazily on first access", () => {
      expect(fs.existsSync(path.join(tmpDir, "otp.db"))).toBe(false);
      getOtpIdentityResponse(MS_KEY);
      expect(fs.existsSync(path.join(tmpDir, "otp.db"))).toBe(true);
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

    test("namespaces by email so two users do not see each other's data", async () => {
      await createOtpIdentity(
        { email: "a@example.com", provider: "microsoft" },
        { name: "A", login: { totp: "otpauth://totp/A" } }
      );
      await createOtpIdentity(
        { email: "b@example.com", provider: "microsoft" },
        { name: "B", login: { totp: "otpauth://totp/B" } }
      );

      const a = getOtpIdentityResponse({
        email: "a@example.com",
        provider: "microsoft",
      });
      const b = getOtpIdentityResponse({
        email: "b@example.com",
        provider: "microsoft",
      });
      expect(a.items.map((i) => i.name)).toEqual(["A"]);
      expect(b.items.map((i) => i.name)).toEqual(["B"]);
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

    test("orders identities by created_at then id", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "First",
        login: { totp: "otpauth://1" },
      });
      // Force a different timestamp so created_at comparison is well-defined.
      await new Promise((r) => setTimeout(r, 5));
      await createOtpIdentity(MS_KEY, {
        name: "Second",
        login: { totp: "otpauth://2" },
      });
      expect(getOtpIdentityResponse(MS_KEY).items.map((i) => i.name)).toEqual([
        "First",
        "Second",
      ]);
    });
  });

  describe("JSON vault migration", () => {
    test("imports a Phase-1 <email>-<provider>.cred.json file on first read", () => {
      const seeded: OtpIdentityResponse = {
        items: [
          {
            id: "json-1",
            name: "FromJson",
            login: { totp: "otpauth://totp/FromJson" },
          },
        ],
      };
      fs.writeFileSync(newLayoutFile, JSON.stringify(seeded));

      const response = getOtpIdentityResponse(MS_KEY);

      expect(response.items.map((i) => i.name)).toEqual(["FromJson"]);
      // Original file is preserved with a .migrated suffix so the operator
      // can verify the import before the file is finally removed.
      expect(fs.existsSync(newLayoutFile)).toBe(false);
      expect(fs.existsSync(`${newLayoutFile}.migrated`)).toBe(true);
    });

    test("imports a pre-multi-provider <email>.cred.json for the microsoft provider", () => {
      const seeded: OtpIdentityResponse = {
        items: [
          {
            id: "legacy-1",
            name: "LegacyOnly",
            login: { totp: "otpauth://totp/Legacy" },
          },
        ],
      };
      fs.writeFileSync(legacyLayoutFile, JSON.stringify(seeded));

      const response = getOtpIdentityResponse(MS_KEY);

      expect(response.items.map((i) => i.name)).toEqual(["LegacyOnly"]);
      expect(fs.existsSync(legacyLayoutFile)).toBe(false);
      expect(fs.existsSync(`${legacyLayoutFile}.migrated`)).toBe(true);
    });

    test("does not consult the pre-multi-provider file for non-microsoft providers", () => {
      const seeded: OtpIdentityResponse = {
        items: [{ id: "x", name: "X", login: { totp: "otpauth://x" } }],
      };
      fs.writeFileSync(legacyLayoutFile, JSON.stringify(seeded));

      const response = getOtpIdentityResponse(GOOGLE_KEY);

      expect(response).toEqual({ items: [] });
      // The legacy file is not touched; it might be a microsoft user's data
      // and they haven't logged in yet.
      expect(fs.existsSync(legacyLayoutFile)).toBe(true);
    });

    test("prefers the new-layout file over the legacy file when both exist", () => {
      fs.writeFileSync(
        newLayoutFile,
        JSON.stringify({
          items: [
            { id: "n1", name: "FromNew", login: { totp: "otpauth://n" } },
          ],
        })
      );
      fs.writeFileSync(
        legacyLayoutFile,
        JSON.stringify({
          items: [
            { id: "l1", name: "FromLegacy", login: { totp: "otpauth://l" } },
          ],
        })
      );

      const response = getOtpIdentityResponse(MS_KEY);

      expect(response.items.map((i) => i.name)).toEqual(["FromNew"]);
      // Legacy file is left alone so it could still be migrated for some
      // other context — we only consume one source per user.
      expect(fs.existsSync(legacyLayoutFile)).toBe(true);
      expect(fs.existsSync(`${newLayoutFile}.migrated`)).toBe(true);
    });

    test("only runs the migration once per user per process", () => {
      fs.writeFileSync(
        newLayoutFile,
        JSON.stringify({
          items: [{ id: "x", name: "X", login: { totp: "otpauth://x" } }],
        })
      );

      // First read migrates and renames.
      getOtpIdentityResponse(MS_KEY);

      // Re-create the JSON file with different data; subsequent reads must
      // NOT re-import (we already marked this user migrated for the process).
      fs.writeFileSync(
        newLayoutFile,
        JSON.stringify({
          items: [
            {
              id: "y",
              name: "Y-should-be-ignored",
              login: { totp: "otpauth://y" },
            },
          ],
        })
      );

      const response = getOtpIdentityResponse(MS_KEY);
      expect(response.items.map((i) => i.name)).toEqual(["X"]);
    });

    test("does not crash when the JSON file is corrupt — user looks empty", () => {
      fs.writeFileSync(newLayoutFile, "not-json{{{");

      const response = getOtpIdentityResponse(MS_KEY);

      expect(response).toEqual({ items: [] });
      // Corrupt file is left on disk for manual recovery.
      expect(fs.existsSync(newLayoutFile)).toBe(true);
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
      expect(response.items[0].id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
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
    test("updates the matching identity", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Github",
        login: { totp: "otpauth://totp/Github?secret=A" },
      });
      const id = getOtpIdentityResponse(MS_KEY).items[0].id;

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

      expect(getOtpIdentityResponse(MS_KEY)).toEqual(before);
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
      expect(after.find((i) => i.id === googleSnapshot.id)).toEqual(
        googleSnapshot
      );
    });

    test("cannot update another user's identity (user_id is part of the WHERE clause)", async () => {
      // Two users seeded with identities; trying to update user A's row from
      // user B's session must be a no-op.
      await createOtpIdentity(MS_KEY, {
        name: "Mine",
        login: { totp: "otpauth://totp/Mine" },
      });
      const myId = getOtpIdentityResponse(MS_KEY).items[0].id;
      const otherKey: UserKey = {
        email: "other@example.com",
        provider: "microsoft",
      };
      await createOtpIdentity(otherKey, {
        name: "Theirs",
        login: { totp: "otpauth://totp/Theirs" },
      });

      await updateOtpIdentity(otherKey, myId, {
        name: "Hijacked",
        login: { totp: "otpauth://totp/Hijacked" },
      });

      // Original owner's record is unchanged.
      expect(getOtpIdentityResponse(MS_KEY).items[0].name).toBe("Mine");
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

    test("is safe to call against a user that has never written anything", async () => {
      const freshKey: UserKey = {
        email: "brand-new@example.com",
        provider: "microsoft",
      };
      await expect(
        deleteOtpIdentity(freshKey, "any-id")
      ).resolves.toBeUndefined();
      expect(getOtpIdentityResponse(freshKey).items).toHaveLength(0);
    });

    test("cannot delete another user's identity", async () => {
      await createOtpIdentity(MS_KEY, {
        name: "Mine",
        login: { totp: "otpauth://totp/Mine" },
      });
      const myId = getOtpIdentityResponse(MS_KEY).items[0].id;
      const otherKey: UserKey = {
        email: "other@example.com",
        provider: "microsoft",
      };

      await deleteOtpIdentity(otherKey, myId);

      // Original owner's record survives.
      expect(getOtpIdentityResponse(MS_KEY).items.map((i) => i.name)).toEqual([
        "Mine",
      ]);
    });
  });

  describe("OTP_DB_PATH env override", () => {
    afterEach(() => vi.unstubAllEnvs());

    test("uses an absolute OTP_DB_PATH as-is", async () => {
      const customDir = fs.mkdtempSync(path.join(tmpDir, "custom-"));
      const customDb = path.join(customDir, "vault.sqlite");
      vi.stubEnv("OTP_DB_PATH", customDb);
      // Drop the connection cached under the default `otp.db` path so the
      // next call observes the new env var.
      _resetForTests();

      await createOtpIdentity(MS_KEY, {
        name: "Custom",
        login: { totp: "otpauth://x" },
      });

      expect(fs.existsSync(customDb)).toBe(true);
      // Default `otp.db` should not have been created in cwd.
      expect(fs.existsSync(path.join(tmpDir, "otp.db"))).toBe(false);
      expect(getOtpIdentityResponse(MS_KEY).items.map((i) => i.name)).toEqual([
        "Custom",
      ]);
    });

    test("creates the parent directory when it does not yet exist", async () => {
      // Simulates a brand-new Azure App Service where /home/site/data does
      // not yet exist on first boot.
      const nestedDb = path.join(tmpDir, "nested", "deeper", "otp.db");
      vi.stubEnv("OTP_DB_PATH", nestedDb);
      _resetForTests();

      await createOtpIdentity(MS_KEY, {
        name: "Nested",
        login: { totp: "otpauth://x" },
      });

      expect(fs.existsSync(nestedDb)).toBe(true);
    });

    test("falls back to cwd/otp.db when OTP_DB_PATH is empty", async () => {
      vi.stubEnv("OTP_DB_PATH", "   ");
      _resetForTests();

      await createOtpIdentity(MS_KEY, {
        name: "Default",
        login: { totp: "otpauth://x" },
      });

      expect(fs.existsSync(path.join(tmpDir, "otp.db"))).toBe(true);
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
