import { createCookieSessionStorage } from "@remix-run/node"; // or cloudflare/deno
import type { User } from "~/types.d.ts";
import { CLIENT_SECRET } from "~/utils/backend/SSO";

export type SessionData = {
  access_token: string;
  user: User;
};

type SessionFlashData = {
  error: string;
};

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
