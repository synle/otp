import { createCookieSessionStorage } from "@remix-run/node";
import type { User } from "~/types.d.ts";

/**
 * Shape of data persisted in the session cookie after a successful login.
 *
 * Note: the upstream OAuth `access_token` is intentionally NOT stored. It is
 * only needed once at login (to fetch the profile) and keeping it in the
 * cookie expands the blast radius of an exfiltration.
 */
export type SessionData = {
  /** Normalized profile of the authenticated user. */
  user: User;
};

/**
 * One-shot flash data stored in the session (consumed on the next read).
 */
type SessionFlashData = {
  error: string;
};

/**
 * Resolve the secret used to sign the session cookie.
 *
 * Priority:
 *   1. `SESSION_SECRET` (preferred, decoupled from any one provider)
 *   2. `AAD_SSO_CLIENT_VALUE` (legacy fallback so existing deployments keep working)
 *   3. The literal `"s3cret1"` — only allowed outside production
 *
 * In production, falling through to (3) is a security failure: the cookie
 * carries the user identity that gates every route, so a known/empty secret
 * means anyone can forge a session. We hard-fail at boot in that case.
 */
export function _resolveSessionSecret(): string {
  const fromEnv =
    process.env.SESSION_SECRET || process.env.AAD_SSO_CLIENT_VALUE;
  if (fromEnv) {
    return fromEnv;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET (or AAD_SSO_CLIENT_VALUE) must be set in production"
    );
  }

  return "s3cret1";
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Cookie-backed session storage.
 *
 * - `httpOnly` blocks JS reads.
 * - `sameSite: "lax"` blocks cross-site form CSRF on mutating routes.
 * - `secure` is enabled in production so the cookie never travels over HTTP.
 */
const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    cookie: {
      name: "__session",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: isProduction,
      secrets: [_resolveSessionSecret()],
    },
  });

export { commitSession, destroySession, getSession };
