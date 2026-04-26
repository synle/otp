import { ConfidentialClientApplication } from "@azure/msal-node";
import axios from "axios";
import type { User } from "~/types.d.ts";
import type { AuthProvider, AuthenticateArgs } from "./types";

/**
 * Microsoft / Azure AD provider.
 *
 * Reads:
 *   - `AAD_SSO_TENANT_ID`     - tenant guid; "common" allows multi-tenant + MSAs.
 *   - `AAD_SSO_CLIENT_ID`     - app registration (client) id.
 *   - `AAD_SSO_CLIENT_VALUE`  - client secret value.
 */

const TENANT_ID = process.env["AAD_SSO_TENANT_ID"] || "common";
const CLIENT_ID = process.env["AAD_SSO_CLIENT_ID"] || "";
const CLIENT_SECRET = process.env["AAD_SSO_CLIENT_VALUE"] || "";
const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;

/** Graph scopes — `user.read` is enough to call `/me`. */
export const MICROSOFT_SCOPE = ["user.read"];

/**
 * Lazily-constructed MSAL confidential client.
 *
 * The MSAL constructor throws if `clientSecret` is empty, which makes a
 * top-level `new ConfidentialClientApplication(...)` blow up at module load
 * in any environment that doesn't have AAD_SSO_CLIENT_VALUE set (tests,
 * Google-only deployments). Defer construction until something actually
 * needs to talk to AAD.
 */
let _msal: ConfidentialClientApplication | undefined;
function _getMsal(): ConfidentialClientApplication {
  if (!_msal) {
    _msal = new ConfidentialClientApplication({
      auth: {
        clientId: CLIENT_ID,
        authority: AUTHORITY,
        clientSecret: CLIENT_SECRET,
      },
    });
  }
  return _msal;
}

/**
 * Subset of the Microsoft Graph `/me` profile that we read at login.
 */
export type GraphMeProfile = {
  id?: string;
  mail?: string | null;
  userPrincipalName?: string | null;
  displayName?: string | null;
};

/**
 * Normalize a Graph `/me` profile into our provider-agnostic `User`.
 *
 * - Prefers `mail`; falls back to `userPrincipalName` (personal MSAs often
 *   have `mail: null` even though the upn is a valid email).
 * - Lowercases the email so it matches the vault key the DAO uses.
 * - Throws if neither field is present (incomplete profile is unusable).
 */
export function normalizeMicrosoftProfile(profile: GraphMeProfile): User {
  const email = (profile.mail || profile.userPrincipalName || "")
    .trim()
    .toLowerCase();
  if (!email) {
    throw new Error(
      "microsoft profile is missing both mail and userPrincipalName"
    );
  }
  return {
    id: profile.id || email,
    email,
    displayName: profile.displayName || email,
    provider: "microsoft",
  };
}

async function _getUserInformation(
  accessToken: string
): Promise<GraphMeProfile> {
  const { data } = await axios.get<GraphMeProfile>(
    "https://graph.microsoft.com/v1.0/me",
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
 * The microsoft `AuthProvider` adapter.
 *
 * `callbackMode: "post"` because we ask AAD to use `responseMode=form_post` —
 * that gives us a CSRF-resistant callback (POST + state nonce) without
 * sending the auth code through redirect chains.
 */
export const microsoftProvider: AuthProvider = {
  id: "microsoft",
  callbackMode: "post",

  async buildAuthUrl({ redirectUri, state }) {
    return _getMsal().getAuthCodeUrl({
      scopes: MICROSOFT_SCOPE,
      redirectUri,
      state,
      prompt: "select_account",
      responseMode: "form_post",
    });
  },

  async authenticate({ code, redirectUri, formData }: AuthenticateArgs) {
    const response = await _getMsal().acquireTokenByCode({
      scopes: MICROSOFT_SCOPE,
      redirectUri,
      ...{
        code,
        client_info: formData?.get("client_info") || "",
        session_state: formData?.get("session_state") || "",
      },
    });

    const profile = await _getUserInformation(response.accessToken);
    return normalizeMicrosoftProfile(profile);
  },
};
