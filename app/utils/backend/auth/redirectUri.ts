import type { AuthProviderId } from "~/types.d.ts";

/**
 * Per-provider override for the redirect URI used at /authorize and /token.
 *
 * The IdP-side app registration already pins the allowed redirect URIs, so
 * what we put here is mainly defense in depth + a way to make local-tunnel
 * setups (ngrok) work without touching the request URL.
 */
const _REDIRECT_ENV_KEY: Record<AuthProviderId, string> = {
  microsoft: "MICROSOFT_REDIRECT_URL",
  google: "GOOGLE_REDIRECT_URL",
};

/**
 * Compute the OAuth `redirect_uri` for a given provider + request.
 *
 * Resolution order:
 *   1. `${PROVIDER}_REDIRECT_URL` (per-provider, full URL)
 *   2. `AAD_REDIRECT_URL` for microsoft (legacy alias kept for old deployments)
 *   3. `AUTH_BASE_HOST_URL` || `AAD_SSO_BASE_HOST_URL` + `callbackPath`
 *   4. The request's own host, upgraded to https unless localhost
 *
 * The fallback to the request URL is convenient in dev but unsafe behind a
 * permissive proxy in prod, so we'd rather operators set an env var. The
 * IdP's exact-match check on the redirect URI is what saves us when they
 * don't.
 */
export function computeRedirectUri(args: {
  request: Request;
  providerId: AuthProviderId;
  callbackPath: string;
}): string {
  const { request, providerId, callbackPath } = args;

  const perProvider = process.env[_REDIRECT_ENV_KEY[providerId]];
  if (perProvider) return perProvider;

  if (providerId === "microsoft" && process.env.AAD_REDIRECT_URL) {
    return process.env.AAD_REDIRECT_URL;
  }

  const baseHost =
    process.env.AUTH_BASE_HOST_URL || process.env.AAD_SSO_BASE_HOST_URL;
  if (baseHost) {
    return `${baseHost.replace(/\/$/, "")}${callbackPath}`;
  }

  try {
    const url = new URL(request.url);
    const origin = url.host.includes("localhost")
      ? `${url.protocol}//${url.host}`
      : `https://${url.host}`;
    return `${origin}${callbackPath}`;
  } catch {
    return callbackPath;
  }
}
