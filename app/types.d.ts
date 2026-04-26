/**
 * Identifier for the SSO provider that authenticated a user.
 *
 * Persisted alongside the user in the session cookie and used to namespace
 * the on-disk OTP vault, so that the same email logging in via different
 * providers maps to *different* vaults (e.g. `me@x.com-microsoft.cred.json`
 * and `me@x.com-google.cred.json` are independent).
 */
export type AuthProviderId = "microsoft" | "google";

/**
 * Provider-agnostic profile of the currently authenticated user.
 *
 * Constructed by each provider's adapter from the raw upstream profile
 * (Microsoft Graph `/me`, Google `userinfo`, ...) and stored in the
 * session cookie. Frontend code should treat this as the canonical user
 * shape and never depend on raw provider fields.
 */
export type User = {
  /** Stable id from the upstream provider (`oid`/`id`/`sub`). */
  id: string;
  /** Lowercased email; used together with `provider` as the vault key. */
  email: string;
  /** Human-readable display name for the user. */
  displayName: string;
  /** Provider that issued this identity. Part of the vault key. */
  provider: AuthProviderId;
};
