import * as fs from "node:fs";
import * as path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { v4 as uuidv4 } from "uuid";
import type { AuthProviderId } from "~/types.d.ts";

/**
 * A single TOTP identity record persisted in SQLite.
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
 * Wire format used by both the storage layer and the `/api/otp` route.
 */
export type OtpIdentityResponse = {
  items: OtpIdentity[];
};

/**
 * The minimum identity needed to address a user's vault.
 *
 * Vaults are namespaced as `<sanitized-email>-<provider>` so the same
 * human logging in via Microsoft and Google sees two independent stores.
 * The User type satisfies this shape so callers can pass `session.user`
 * directly.
 */
export type UserKey = {
  email: string;
  provider: AuthProviderId;
};

/** Allowlist of provider ids we accept as part of a vault key. */
const _ALLOWED_PROVIDERS: ReadonlySet<AuthProviderId> = new Set([
  "microsoft",
  "google",
]);

/** Default SQLite filename, used when `OTP_DB_PATH` is unset. */
const _DEFAULT_DB_FILENAME = "otp.db";

/**
 * Strict-allowlist sanitizer for the email portion of the vault key.
 *
 * Originally needed to keep an attacker-influenced email from formatting
 * into a filesystem path. Even with SQLite-backed storage we still:
 *   - resolve legacy `<email>-<provider>.cred.json` files at migration time,
 *   - derive a stable `user_id` column value from `(email, provider)`,
 * so the same lowercasing + allowlist still applies.
 */
export function sanitizeEmailForFilename(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed) {
    throw new Error("email is required to derive a vault key");
  }
  return trimmed.replace(/[^a-z0-9._%+@-]/g, "_");
}

/**
 * Compose the per-user key stored in the `identities.user_id` column.
 */
function _userIdFor(key: UserKey): string {
  if (!_ALLOWED_PROVIDERS.has(key.provider)) {
    throw new Error(`unknown auth provider: ${key.provider}`);
  }
  return `${sanitizeEmailForFilename(key.email)}-${key.provider}`;
}

// ---------------------------------------------------------------------------
// Connection + schema management
// ---------------------------------------------------------------------------

/**
 * Cached connection per absolute DB path.
 *
 * The DB file lives at `${cwd}/otp.db`. In production CWD is fixed so this
 * is effectively a singleton; in tests each spec `chdir`s into a fresh
 * tmpdir, which yields a different absolute path and therefore a fresh
 * connection — exactly the isolation tests need.
 */
const _connections = new Map<string, DatabaseSync>();

/**
 * Tracks per-user vault migrations that have already been attempted in
 * this process, so we don't keep stat-ing for legacy files on every read.
 */
const _migratedUserIds = new Set<string>();

/**
 * Resolve where the SQLite file should live.
 *
 * Priority:
 *   1. `OTP_DB_PATH` env var. Absolute path is used as-is; relative paths
 *      are resolved against `process.cwd()`. This is the knob deployments
 *      use to point at a persisted volume — e.g. on Azure App Service Linux,
 *      `OTP_DB_PATH=/home/site/data/otp.db` so the database survives slot
 *      swaps and restarts.
 *   2. `${cwd}/otp.db` for development and tests.
 */
function _resolveDbPath(): string {
  const fromEnv = process.env.OTP_DB_PATH;
  if (fromEnv && fromEnv.trim()) {
    return path.resolve(process.cwd(), fromEnv.trim());
  }
  return path.resolve(process.cwd(), _DEFAULT_DB_FILENAME);
}

function _initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS identities (
      id          TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      name        TEXT NOT NULL,
      totp        TEXT NOT NULL,
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_identities_user
      ON identities(user_id);
  `);
}

function _getDb(): DatabaseSync {
  const dbPath = _resolveDbPath();
  let db = _connections.get(dbPath);
  if (!db) {
    // Materialize the parent directory so a fresh deploy with an
    // OTP_DB_PATH that doesn't exist yet (e.g. /home/site/data/otp.db on a
    // brand-new Azure App Service) doesn't blow up at SQLite open time.
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);
    _initSchema(db);
    _connections.set(dbPath, db);
  }
  return db;
}

/**
 * Test-only: drop all cached connections + migration markers.
 *
 * Useful for tests that hop between CWDs and want a clean slate. Production
 * code never calls this.
 */
export function _resetForTests(): void {
  for (const db of _connections.values()) {
    try {
      db.close();
    } catch {
      // ignore — already closed
    }
  }
  _connections.clear();
  _migratedUserIds.clear();
}

// ---------------------------------------------------------------------------
// JSON-vault → SQLite migration
// ---------------------------------------------------------------------------

/**
 * One-shot import of any pre-existing JSON vault for `key` into SQLite.
 *
 * Looks for, in order:
 *   1. `<sanitized-email>-<provider>.cred.json` (post-Phase-1 layout)
 *   2. `<sanitized-email>.cred.json` (legacy single-provider layout, only
 *      consulted for the microsoft provider)
 *
 * The matching file is parsed, its items are inserted, and the file is
 * renamed with a `.migrated` suffix so the migration is idempotent and the
 * original is preserved for audit.
 *
 * If the file is unreadable / not JSON / has no items, we silently treat
 * the user as new — the alternative (refusing to log in) is worse.
 */
function _migrateJsonVaultIfPresent(key: UserKey): void {
  const userId = _userIdFor(key);
  if (_migratedUserIds.has(userId)) {
    return;
  }
  _migratedUserIds.add(userId);

  const safeEmail = sanitizeEmailForFilename(key.email);
  const candidates: string[] = [`${safeEmail}-${key.provider}.cred.json`];
  if (key.provider === "microsoft") {
    candidates.push(`${safeEmail}.cred.json`);
  }

  for (const relPath of candidates) {
    const abs = path.resolve(process.cwd(), relPath);
    if (!fs.existsSync(abs)) continue;

    try {
      const parsed = JSON.parse(
        fs.readFileSync(abs, "utf-8")
      ) as Partial<OtpIdentityResponse>;
      const items = Array.isArray(parsed?.items) ? parsed.items : [];
      _bulkInsert(userId, items);
      fs.renameSync(abs, `${abs}.migrated`);
    } catch {
      // Corrupt JSON — leave it on disk for manual recovery, but don't
      // block the user from logging in.
    }
    return; // only one source per user
  }
}

function _bulkInsert(userId: string, items: readonly OtpIdentity[]): void {
  if (items.length === 0) return;

  const db = _getDb();
  const insert = db.prepare(`
    INSERT OR IGNORE INTO identities
      (id, user_id, name, totp, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const now = Date.now();
  db.exec("BEGIN");
  try {
    for (const item of items) {
      insert.run(
        item.id || uuidv4(),
        userId,
        item.name,
        item.login?.totp ?? "",
        now,
        now
      );
    }
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/**
 * Read every identity for a user.
 *
 * Returns an empty list when the user has nothing persisted yet, so the
 * frontend's "first identity" path stays implicit.
 */
export function getOtpIdentityResponse(key: UserKey): OtpIdentityResponse {
  const userId = _userIdFor(key);
  _migrateJsonVaultIfPresent(key);

  // `rowid` is sqlite's implicit insertion-order column. We use it as a
  // tie-breaker because two creates in the same millisecond would otherwise
  // sort by random UUID.
  const rows = _getDb()
    .prepare(
      `SELECT id, name, totp FROM identities
         WHERE user_id = ?
         ORDER BY created_at ASC, rowid ASC`
    )
    .all(userId) as Array<{ id: string; name: string; totp: string }>;

  return {
    items: rows.map((row) => ({
      id: row.id,
      name: row.name,
      login: { totp: row.totp },
    })),
  };
}

/**
 * Append a new identity, assigning a fresh v4 UUID. Any caller-supplied
 * `id` is discarded (the JSDoc previously claimed this and we preserve
 * that behavior).
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
  const userId = _userIdFor(key);
  _migrateJsonVaultIfPresent(key);

  const now = Date.now();
  _getDb()
    .prepare(
      `INSERT INTO identities (id, user_id, name, totp, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(uuidv4(), userId, body.name, body.login.totp, now, now);
}

/**
 * Patch the identity matching `id`. Calling with an unknown id is a no-op
 * (matching the file-backed predecessor's contract).
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
  const userId = _userIdFor(key);
  _migrateJsonVaultIfPresent(key);

  _getDb()
    .prepare(
      `UPDATE identities
          SET name = ?, totp = ?, updated_at = ?
        WHERE id = ? AND user_id = ?`
    )
    .run(body.name, body.login.totp, Date.now(), id, userId);
}

/**
 * Remove the identity matching `id`. No-op when no row matches.
 */
export async function deleteOtpIdentity(key: UserKey, id: string) {
  const userId = _userIdFor(key);
  _migrateJsonVaultIfPresent(key);

  _getDb()
    .prepare(`DELETE FROM identities WHERE id = ? AND user_id = ?`)
    .run(id, userId);
}
