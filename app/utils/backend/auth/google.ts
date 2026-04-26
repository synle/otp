import axios from "axios";
import type { User } from "~/types.d.ts";
import type { AuthProvider, AuthenticateArgs } from "./types";

/**
 * Google OAuth 2.0 / OIDC provider.
 *
 * Implemented as a thin axios wrapper around the public OAuth endpoints
 * rather than pulling in the `googleapis` SDK — the surface we need is
 * tiny (one POST and one GET) and the SDK adds ~5MB of transitive deps.
 *
 * Reads:
 *   - `GOOGLE_OAUTH_CLIENT_ID`     - OAuth client id from Google Cloud Console.
 *   - `GOOGLE_OAUTH_CLIENT_SECRET` - matching client secret.
 *
 * The redirect URI(s) must be registered in the Google Cloud Console under
 * the same OAuth client; Google enforces an exact-match check.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";

/** OIDC scopes needed to read the user's email + display name. */
const GOOGLE_SCOPE = ["openid", "email", "profile"];

/**
 * Subset of the Google OAuth2 v2 userinfo response we read at login.
 */
export type GoogleUserInfo = {
  /** Stable Google account id (`sub` in OIDC terms). */
  id?: string;
  email?: string;
  /**
   * Whether Google has verified the email. We don't gate on this for the
   * cross-provider takeover scenario (vaults are namespaced per provider so
   * collision isn't possible), but a sketchy `email_verified: false` is a
   * useful signal we surface in the normalized shape's `id` only.
   */
  verified_email?: boolean;
  name?: string;
};

/**
 * Normalize a Google userinfo response into our provider-agnostic `User`.
 *
 * - Lowercases the email so it matches the vault key the DAO uses.
 * - Throws if email is missing — the vault is keyed by it, so we can't
 *   continue without one.
 */
export function normalizeGoogleProfile(profile: GoogleUserInfo): User {
  const email = (profile.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("google profile is missing email");
  }
  return {
    id: profile.id || email,
    email,
    displayName: profile.name || email,
    provider: "google",
  };
}

/**
 * Exchange an auth code for an access token at Google's /token endpoint.
 *
 * Exposed for unit tests; runtime callers should go through `authenticate`.
 */
export async function exchangeGoogleCode(args: {
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
}): Promise<{ accessToken: string }> {
  const body = new URLSearchParams({
    code: args.code,
    client_id: args.clientId,
    client_secret: args.clientSecret,
    redirect_uri: args.redirectUri,
    grant_type: "authorization_code",
  });

  const { data } = await axios.post<{ access_token: string }>(
    GOOGLE_TOKEN_URL,
    body.toString(),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
    }
  );

  if (!data.access_token) {
    throw new Error("google token response missing access_token");
  }
  return { accessToken: data.access_token };
}

/**
 * Fetch the user profile from Google's userinfo endpoint.
 *
 * Exposed for unit tests; runtime callers should go through `authenticate`.
 */
export async function fetchGoogleUserInfo(
  accessToken: string
): Promise<GoogleUserInfo> {
  const { data } = await axios.get<GoogleUserInfo>(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  return data;
}

function _requireGoogleClientCredentials(): {
  clientId: string;
  clientSecret: string;
} {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET || "";
  if (!clientId || !clientSecret) {
    throw new Error(
      "GOOGLE_OAUTH_CLIENT_ID and GOOGLE_OAUTH_CLIENT_SECRET must be set"
    );
  }
  return { clientId, clientSecret };
}

/**
 * The google `AuthProvider` adapter.
 *
 * `callbackMode: "get"` because Google's default response_mode is `query` —
 * the auth code comes back on a redirect to `/login_callback?code=...&state=...`.
 */
export const googleProvider: AuthProvider = {
  id: "google",
  callbackMode: "get",

  async buildAuthUrl({ redirectUri, state }) {
    const { clientId } = _requireGoogleClientCredentials();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPE.join(" "),
      state,
      // `online` is fine — we only call userinfo once at login and don't
      // need a refresh token.
      access_type: "online",
      prompt: "select_account",
    });
    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  },

  async authenticate({ code, redirectUri }: AuthenticateArgs) {
    const { clientId, clientSecret } = _requireGoogleClientCredentials();

    const { accessToken } = await exchangeGoogleCode({
      code,
      redirectUri,
      clientId,
      clientSecret,
    });
    const profile = await fetchGoogleUserInfo(accessToken);
    return normalizeGoogleProfile(profile);
  },
};
