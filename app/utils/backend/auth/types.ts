import type { AuthProviderId, User } from "~/types.d.ts";

/**
 * Inputs handed to a provider when redeeming the auth code.
 *
 * `formData` carries the full POST body for `responseMode=form_post` providers
 * (e.g. AAD). GET-callback providers pass `formData: undefined`.
 */
export type AuthenticateArgs = {
  code: string;
  redirectUri: string;
  formData?: URLSearchParams;
};

/**
 * Pluggable SSO provider adapter.
 *
 * Each adapter encapsulates the provider-specific bits:
 *   - Building the OAuth authorization URL
 *   - Redeeming the auth code and fetching the upstream profile
 *   - Normalizing that profile into the project-wide `User` shape
 *
 * Routes consume this interface only; they never branch on `id`. The only
 * thing routes need to know about a provider in advance is `callbackMode`,
 * because POST and GET callbacks dispatch differently in Remix.
 */
export type AuthProvider = {
  /** Stable id used in the URL: `/api/auth/:provider/...`. */
  id: AuthProviderId;
  /**
   * How the IdP returns the auth code.
   *   - `"get"`  - URL query string (Google's default)
   *   - `"post"` - form-encoded POST body (AAD with `response_mode=form_post`)
   */
  callbackMode: "get" | "post";
  /** Build the OAuth authorization URL the user is sent to. */
  buildAuthUrl(args: { redirectUri: string; state: string }): Promise<string>;
  /**
   * Redeem the auth code for tokens, fetch the upstream profile, and return
   * a normalized `User`. The implementation must NOT persist anything; that
   * is the route's responsibility.
   */
  authenticate(args: AuthenticateArgs): Promise<User>;
};
