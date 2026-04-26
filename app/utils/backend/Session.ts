import { createCookieSessionStorage } from "@remix-run/node"; // or cloudflare/deno
import type { User } from "~/types.d.ts";
import { CLIENT_SECRET } from "~/utils/backend/SSO";

/**
 * Shape of data persisted in the session cookie after a successful AAD login.
 */
export type SessionData = {
  /** Microsoft Graph access token, used server-side for downstream API calls. */
  access_token: string;
  /** The user's Graph `/me` profile, snapshot at login time. */
  user: User;
};

/**
 * One-shot flash data stored in the session (consumed on the next read).
 */
type SessionFlashData = {
  error: string;
};

/**
 * Cookie-backed session storage.
 *
 * - `httpOnly` is enabled so the cookie is unreadable from JS.
 * - The signing secret falls back to a known string in dev so the app boots
 *   without env vars; production deployments should always set `AAD_SSO_CLIENT_VALUE`.
 */
const { getSession, commitSession, destroySession } =
  createCookieSessionStorage<SessionData, SessionFlashData>({
    // a Cookie from `createCookie` or the CookieOptions to create one
    cookie: {
      name: "__session",

      // all of these are optional
      // domain: "remix.run",
      // Expires can also be set (although maxAge overrides it when used in combination).
      // Note that this method is NOT recommended as `new Date` creates only one date on each server deployment, not a dynamic date in the future!
      // expires: new Date(Date.now() + 60_000 * 60 * 24 * 7 * 4),
      httpOnly: true,
      // maxAge: 60,
      // path: "/",
      // sameSite: "lax",
      secrets: [CLIENT_SECRET || "s3cret1"],
      // secure: true,
    },
  });

export { commitSession, destroySession, getSession };
