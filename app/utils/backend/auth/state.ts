import { createCookieSessionStorage } from "@remix-run/node";
import * as crypto from "node:crypto";
import type { AuthProviderId } from "~/types.d.ts";

/**
 * Body of the short-lived "pre-auth" cookie set when the user starts an OAuth
 * flow. It binds the upcoming callback to the browser session that initiated
 * it (so a different tab / a stranger's link can't complete the flow on the
 * victim's behalf — login CSRF) and pins the redirect URI server-side so the
 * callback handler doesn't have to trust the URL it was reached through.
 */
export type AuthState = {
  /** Random nonce. Must equal the `state` query/form param at callback. */
  nonce: string;
  /** The provider this state was created for. Must match the URL provider. */
  providerId: AuthProviderId;
  /** Redirect URI used at /authorize, replayed at /token. */
  redirectUri: string;
};

const PRE_AUTH_COOKIE_NAME = "__auth_state";
const PRE_AUTH_TTL_SECONDS = 5 * 60; // 5 minutes is plenty for the OAuth dance

/**
 * Resolve the secret used to sign the pre-auth cookie.
 *
 * Reuses `SESSION_SECRET` (or the AAD legacy fallback) so a deployment only
 * needs to configure one secret. In dev a known literal is fine; in
 * production we hard-fail rather than silently accept forgeable state.
 */
function _resolveStateSecret(): string {
  const fromEnv = process.env.SESSION_SECRET || process.env.AAD_SSO_CLIENT_VALUE;
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

const _stateStorage = createCookieSessionStorage<{ state: AuthState }>({
  cookie: {
    name: PRE_AUTH_COOKIE_NAME,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: PRE_AUTH_TTL_SECONDS,
    secrets: [_resolveStateSecret()],
  },
});

/**
 * Begin an OAuth flow.
 *
 * Generates a fresh random nonce, stores it server-side via a signed cookie,
 * and returns the value to put in the `state` query param + the `Set-Cookie`
 * header to issue alongside the 302 redirect.
 */
export async function startAuthState(args: {
  providerId: AuthProviderId;
  redirectUri: string;
}): Promise<{ state: string; setCookie: string }> {
  const nonce = crypto.randomBytes(32).toString("base64url");

  const session = await _stateStorage.getSession();
  session.set("state", {
    nonce,
    providerId: args.providerId,
    redirectUri: args.redirectUri,
  });
  const setCookie = await _stateStorage.commitSession(session);

  return { state: nonce, setCookie };
}

/**
 * Validate and consume the pre-auth cookie at the callback.
 *
 * Returns the stored state if and only if:
 *   - a state cookie exists,
 *   - the URL/form `state` parameter matches the cookie nonce *exactly*,
 *   - the providerId in the cookie matches the route's `:provider`.
 *
 * Caller must use the returned `clearCookie` header to expire the cookie so
 * the same nonce cannot be replayed.
 */
export async function consumeAuthState(args: {
  cookieHeader: string | null;
  urlState: string | null;
  providerId: AuthProviderId;
}): Promise<{ state: AuthState; clearCookie: string } | null> {
  const session = await _stateStorage.getSession(args.cookieHeader);
  const state = session.get("state");
  if (!state) {
    return null;
  }

  // constant-time comparison so the nonce can't be probed via timing
  if (
    !args.urlState ||
    !_safeEqual(args.urlState, state.nonce) ||
    state.providerId !== args.providerId
  ) {
    return null;
  }

  const clearCookie = await _stateStorage.destroySession(session);
  return { state, clearCookie };
}

function _safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}
