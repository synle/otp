import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";
import type { AuthProviderId } from "~/types.d.ts";

/**
 * A single TOTP identity record persisted on disk.
 */
export type OtpIdentity = {
  /** Stable v4 UUID used as the primary key. */
  id: string;
  /** Human-readable label (e.g. "Github (work)"). */
  name: string;
  /** Login secret material. Currently only TOTP `otpauth://` URIs are stored. */
  login: {
    /** Full `otpauth://totp/...` URI from which `authenticator.generate` derives the code. */
    totp: string;
  };
};

/**
 * Wire format used by both the file backing store and the `/api/otp` route.
 */
export type OtpIdentityResponse = {
  items: OtpIdentity[];
};

/**
 * The minimum identity needed to address an on-disk vault.
 *
 * Vaults are namespaced as `<email>-<provider>.cred.json` so the same human
 * logging in via Microsoft and Google sees two independent stores. The User
 * type satisfies this shape so callers can pass `session.user` directly.
 */
export type UserKey = {
  email: string;
  provider: AuthProviderId;
};

/** Allowlist of provider ids accepted as part of the vault filename. */
const _ALLOWED_PROVIDERS: ReadonlySet<AuthProviderId> = new Set([
  "microsoft",
  "google",
]);

/**
 * Strict-allowlist sanitizer for the email portion of the vault filename.
 *
 * The on-disk path is `${cwd}/${email}-${provider}.cred.json` — naively
 * formatting an attacker-influenced email into that path is a write-anywhere
 * vulnerability (`../`, `/`, NUL, etc.). We lowercase, then replace any
 * character outside a conservative allowlist with `_`. The result is an
 * idempotent function so callers can compute the same key from `user.email`
 * on every request.
 */
export function sanitizeEmailForFilename(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("email is required to derive a vault key");
  }
  return trimmed.replace(/[^a-z0-9._%+@-]/g, "_");
}

/**
 * Resolve the on-disk path that holds a user's identities.
 *
 * @throws if the provider id is not in the allowlist or the email is empty.
 */
function _getOtpIdentityFilePath(key: UserKey): string {
  if (!_ALLOWED_PROVIDERS.has(key.provider)) {
    throw new Error(`unknown auth provider: ${key.provider}`);
  }
  const safeEmail = sanitizeEmailForFilename(key.email);
  return `${safeEmail}-${key.provider}.cred.json`;
}

/**
 * One-shot rename of pre-multi-provider vault files.
 *
 * Before this change vaults were stored as `${email}.cred.json`, implicitly
 * tied to the only login path (Microsoft). On read for a Microsoft user we
 * promote that legacy file to `${email}-microsoft.cred.json` so the same data
 * is preserved. The migration is skipped if the new file already exists,
 * because that means the user has already written under the new name and we
 * must not clobber it.
 */
function _migrateLegacyMicrosoftVault(key: UserKey): void {
  if (key.provider !== "microsoft") {
    return;
  }
  const safeEmail = sanitizeEmailForFilename(key.email);
  const legacyPath = `${safeEmail}.cred.json`;
  const newPath = `${safeEmail}-microsoft.cred.json`;
  try {
    if (fs.existsSync(legacyPath) && !fs.existsSync(newPath)) {
      fs.renameSync(legacyPath, newPath);
    }
  } catch {
    // best-effort migration; on failure fall through and the read returns []
  }
}

/**
 * Persist `otpIdentityResponse` for `key` by overwriting the JSON file.
 */
function _updateOtpIdentityFile(
  key: UserKey,
  otpIdentityResponse: OtpIdentityResponse
) {
  fs.writeFileSync(
    _getOtpIdentityFilePath(key),
    JSON.stringify(otpIdentityResponse, null, 2)
  );
}

/**
 * Read the persisted identity list for a user.
 *
 * Returns an empty list when the file does not exist or cannot be parsed,
 * which makes the first-write path implicit (no setup step required).
 */
export function getOtpIdentityResponse(key: UserKey): OtpIdentityResponse {
  _migrateLegacyMicrosoftVault(key);
  try {
    return JSON.parse(
      fs.readFileSync(_getOtpIdentityFilePath(key), "utf-8")
    ) as OtpIdentityResponse;
  } catch (err) {
    return {
      items: [],
    };
  }
}

/**
 * Append a new identity to the user's list, assigning a fresh v4 UUID.
 */
export async function createOtpIdentity(
  key: UserKey,
  body: Partial<OtpIdentity> & {
    name: string;
    login: {
      totp: string;
    };
  }
) {
  const otpIdentityResponse = await getOtpIdentityResponse(key);

  if (!otpIdentityResponse) {
    throw "OtpIdentityFile not found";
  }

  otpIdentityResponse.items.push({
    ...body,
    id: uuidv4(),
  });

  _updateOtpIdentityFile(key, otpIdentityResponse);
}

/**
 * Patch the identity matching `id`. Calling with an unknown id is a no-op.
 */
export async function updateOtpIdentity(
  key: UserKey,
  id: string,
  body: Partial<OtpIdentity> & {
    name: string;
    login: {
      totp: string;
    };
  }
) {
  const otpIdentityResponse = await getOtpIdentityResponse(key);

  if (!otpIdentityResponse) {
    throw "OtpIdentityFile not found";
  }

  otpIdentityResponse.items = otpIdentityResponse.items.map((item) => {
    if (item.id === id) {
      item = { ...item, ...body };
    }
    return item;
  });

  _updateOtpIdentityFile(key, otpIdentityResponse);
}

/**
 * Remove the identity matching `id`. No-op when no item matches.
 */
export async function deleteOtpIdentity(key: UserKey, id: string) {
  const otpIdentityResponse = await getOtpIdentityResponse(key);

  if (!otpIdentityResponse) {
    throw "OtpIdentityFile not found";
  }

  otpIdentityResponse.items = otpIdentityResponse.items.filter((item) => {
    return item.id !== id;
  });

  _updateOtpIdentityFile(key, otpIdentityResponse);
}
