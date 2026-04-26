import { ConfidentialClientApplication } from "@azure/msal-node";

/**
 * Azure Active Directory SSO configuration.
 *
 * Values come from the environment so the same build can be deployed to dev
 * and prod with different tenant/app registrations:
 *   - `AAD_SSO_BASE_HOST_URL`  - public origin used to build the redirect URI
 *   - `AAD_SSO_TENANT_ID`      - tenant guid; defaults to "common" for multi-tenant apps
 *   - `AAD_SSO_CLIENT_ID`      - app registration (client) id
 *   - `AAD_SSO_CLIENT_VALUE`   - client secret value
 *   - `AAD_REDIRECT_URL`       - optional explicit override for the post-login redirect
 */

// configs for SSO
/** Public origin used to construct the OAuth `redirect_uri`. May be empty in dev. */
export const BASE_API_HOST = process.env.AAD_SSO_BASE_HOST_URL;
/** Path the user is sent to in order to start the AAD login dance. */
export const LOGIN_URL = "/api/auth/login";
/** Path AAD posts back to with the auth code after the user authenticates. */
export const LOGIN_CALLBACK_URL = "/api/auth/login_callback";

/** AAD tenant id. `"common"` allows any tenant (multi-tenant apps). */
export const TENANT_ID = process.env["AAD_SSO_TENANT_ID"] || "common";
/** AAD application (client) id. */
export const CLIENT_ID = process.env["AAD_SSO_CLIENT_ID"] || "";
/** AAD client secret value. Also reused as the session-cookie signing secret. */
export const CLIENT_SECRET = process.env["AAD_SSO_CLIENT_VALUE"] || "";
/** OIDC authority URL for `TENANT_ID`. */
export const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;
/** Graph scopes requested at login - `user.read` is enough to call `/me`. */
export const SCOPE = ["user.read"];

/**
 * Pre-configured MSAL confidential client used by the login + callback routes
 * to build the auth-code URL and to redeem the code for tokens.
 */
export const confidentialClientApplication = new ConfidentialClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
    clientSecret: CLIENT_SECRET,
  },
});
