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
  });
});
