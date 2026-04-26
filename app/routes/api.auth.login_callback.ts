import { ActionFunction, redirect } from "@remix-run/node";
import axios from "axios";
import type { User } from "~/types.d.ts";
import { commitSession, getSession } from "~/utils/backend/Session";
import { SCOPE, confidentialClientApplication } from "~/utils/backend/SSO";

/**
 * Raw subset of the Microsoft Graph `/me` profile we read at login.
 *
 * We don't validate the full schema — anything else is opaque.
 */
type GraphMeProfile = {
  id?: string;
  mail?: string | null;
  userPrincipalName?: string | null;
  displayName?: string | null;
};

/**
 * Fetch the user profile from Microsoft Graph `/me` using a bearer access token.
 */
async function _getUserInformation(accessToken: string): Promise<GraphMeProfile> {
  const { data } = await axios.get<GraphMeProfile>(
    `https://graph.microsoft.com/v1.0/me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  return data;
}

/**
 * Normalize a Graph `/me` profile into our provider-agnostic `User` shape.
 *
 * - Prefers `mail`, falling back to `userPrincipalName` for personal MSAs
 *   where `mail` is sometimes null.
 * - Lowercases the email so it matches the vault key the DAO uses.
 */
function _normalizeMicrosoftProfile(profile: GraphMeProfile): User {
  const email = (profile.mail || profile.userPrincipalName || "")
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error("microsoft profile is missing both mail and userPrincipalName");
  }
  return {
    id: profile.id || email,
    email,
    displayName: profile.displayName || email,
    provider: "microsoft",
  };
}

/**
 * POST `/api/auth/login_callback` - AAD posts the auth code here (because
 * `responseMode=form_post` was used at the login step).
 *
 * Steps:
 *   1. Redeem the auth code for an access token
 *   2. Call Graph `/me` to fetch the user profile
 *   3. Persist the *normalized* profile (no access token) in the session
 *   4. Redirect back to `/`
 */
export let action: ActionFunction = async ({ request }) => {
  const formData = new URLSearchParams(await request.text());

  try {
    const redirectUri = process.env.AAD_REDIRECT_URL
      ? process.env.AAD_REDIRECT_URL
      : formData.get("state") || "";

    const response = await confidentialClientApplication.acquireTokenByCode({
      scopes: SCOPE,
      redirectUri,
      ...{
        code: formData.get("code") || "",
        client_info: formData.get("client_info") || "",
        session_state: formData.get("session_state") || "",
      },
    });

    const { accessToken } = response;
    const rawProfile = await _getUserInformation(accessToken);
    const user = _normalizeMicrosoftProfile(rawProfile);

    const session = await getSession(request.headers.get("Cookie"));
    session.set("user", user);

    return redirect(`/`, {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  } catch (err) {
    return new Response(`Failed to authenticate - ${err}`, {
      status: 400,
    });
  }
};
