import type { LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { computeRedirectUri } from "~/utils/backend/auth/redirectUri";
import { getProvider } from "~/utils/backend/auth/registry";
import { startAuthState } from "~/utils/backend/auth/state";

/**
 * GET `/api/auth/:provider/login` - kick off an OAuth authorization-code flow.
 *
 * Steps:
 *   1. Resolve the provider from the URL segment (404-equivalent if unknown).
 *   2. Compute the redirect URI for this deployment.
 *   3. Mint a random state nonce, stash it in a short-lived signed cookie.
 *   4. Ask the provider for its authorization URL.
 *   5. 302 the browser to that URL, attaching the pre-auth `Set-Cookie`.
 *
 * The pre-auth cookie binds this OAuth flow to the browser that started it
 * (login CSRF protection) and pins the redirect URI server-side so the
 * callback never has to trust its own request URL.
 */
export async function loader({ request, params }: LoaderArgs) {
  const provider = getProvider(params.provider);
  if (!provider) {
    return new Response(`Unknown auth provider: ${params.provider}`, {
      status: 404,
    });
  }

  const callbackPath = `/api/auth/${provider.id}/login_callback`;
  const redirectUri = computeRedirectUri({
    request,
    providerId: provider.id,
    callbackPath,
  });

  try {
    const { state, setCookie } = await startAuthState({
      providerId: provider.id,
      redirectUri,
    });

    const authUrl = await provider.buildAuthUrl({ redirectUri, state });
    return redirect(authUrl, { headers: { "Set-Cookie": setCookie } });
  } catch (err) {
    return new Response(`Failed to log in - ${err}`, { status: 400 });
  }
}
