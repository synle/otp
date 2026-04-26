import type { LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import {
  BASE_API_HOST,
  LOGIN_CALLBACK_URL,
  SCOPE,
  confidentialClientApplication,
} from "~/utils/backend/SSO";

/**
 * GET `/api/auth/login` - kick off the AAD authorization-code flow.
 *
 * Computes the redirect URI in this priority order:
 *   1. `BASE_API_HOST` (set via `AAD_SSO_BASE_HOST_URL`)
 *   2. `AAD_REDIRECT_URL` env var (per-deployment override)
 *   3. The current request URL, upgraded to https unless it's localhost
 *
 * Then 302-redirects the user to AAD's auth code URL with `responseMode=form_post`
 * so the callback comes back as a POST (handled in `api.auth.login_callback.ts`).
 */
export async function loader(args: LoaderArgs) {
  const { request } = args;

  let redirectUri = "";
  if (BASE_API_HOST) {
    redirectUri = BASE_API_HOST;
  } else {
    try {
      const url = new URL(request.url);
      redirectUri = process.env.AAD_REDIRECT_URL
        ? process.env.AAD_REDIRECT_URL
        : url.host.includes("localhost")
        ? `${url.protocol}//${url.host}`
        : `https://${url.host}`;
    } catch (err) {}
  }

  redirectUri = `${redirectUri}${LOGIN_CALLBACK_URL}`;

  try {
    const loginUrl = await confidentialClientApplication.getAuthCodeUrl({
      scopes: SCOPE,
      redirectUri,
      state: redirectUri,
      prompt: "select_account",
      responseMode: "form_post", // this forces callback to be a POST instead of a GET
    });
    return redirect(loginUrl);
  } catch (err) {
    return new Response(`Failed to log in - ${err}`, {
      status: 400,
    });
  }
}
