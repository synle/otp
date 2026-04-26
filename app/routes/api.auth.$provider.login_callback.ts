import type { ActionArgs, LoaderArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { getProvider } from "~/utils/backend/auth/registry";
import { consumeAuthState } from "~/utils/backend/auth/state";
import { commitSession, getSession } from "~/utils/backend/Session";

/**
 * Common callback handler used by both the `loader` (GET) and `action`
 * (POST) exports. Picks the correct branch based on whether form data is
 * supplied so the request can come back as either a query-string redirect
 * (Google) or a form_post (AAD).
 */
async function _handleCallback(args: {
  request: Request;
  providerParam: string | undefined;
  code: string | null;
  urlState: string | null;
  formData?: URLSearchParams;
}): Promise<Response> {
  const { request, providerParam, code, urlState, formData } = args;

  const provider = getProvider(providerParam);
  if (!provider) {
    return new Response(`Unknown auth provider: ${providerParam}`, {
      status: 404,
    });
  }
  if (!code) {
    return new Response("Missing auth code", { status: 400 });
  }

  const consumed = await consumeAuthState({
    cookieHeader: request.headers.get("Cookie"),
    urlState,
    providerId: provider.id,
  });
  if (!consumed) {
    // State mismatch / missing / wrong provider — treat as a failed login.
    return new Response("Invalid OAuth state", { status: 400 });
  }
  const { state, clearCookie } = consumed;

  try {
    const user = await provider.authenticate({
      code,
      redirectUri: state.redirectUri,
      formData,
    });

    const session = await getSession(request.headers.get("Cookie"));
    session.set("user", user);

    // Two Set-Cookie headers: one to drop the pre-auth cookie, one to
    // commit the new session.
    const headers = new Headers();
    headers.append("Set-Cookie", clearCookie);
    headers.append("Set-Cookie", await commitSession(session));
    return redirect("/", { headers });
  } catch (err) {
    return new Response(`Failed to authenticate - ${err}`, { status: 400 });
  }
}

/**
 * GET callback (Google's default response_mode).
 */
export async function loader({ request, params }: LoaderArgs) {
  const url = new URL(request.url);
  return _handleCallback({
    request,
    providerParam: params.provider,
    code: url.searchParams.get("code"),
    urlState: url.searchParams.get("state"),
  });
}

/**
 * POST callback (AAD with `response_mode=form_post`).
 */
export async function action({ request, params }: ActionArgs) {
  const formData = new URLSearchParams(await request.text());
  return _handleCallback({
    request,
    providerParam: params.provider,
    code: formData.get("code"),
    urlState: formData.get("state"),
    formData,
  });
}
