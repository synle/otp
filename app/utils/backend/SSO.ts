import { ConfidentialClientApplication } from "@azure/msal-node";

// configs for SSO
export const BASE_API_HOST =
  process.env.AAD_BASE_HOST_URL || `http://localhost:3000`;
export const LOGIN_URL = "/api/auth/login";
export const LOGIN_CALLBACK_URL = "/api/auth/login_callback";

export const CLIENT_ID = process.env["AAD_CLIENT_ID"];
export const CLIENT_SECRET = process.env["AAD_CLIENT_SECRET"];
export const AUTHORITY = `https://login.microsoftonline.com/${process.env["AAD_TENANT_ID"]}`;
export const REDIRECT_PATH = `${BASE_API_HOST}${LOGIN_CALLBACK_URL}`;
export const SCOPE = ["user.read"];

// msal init
export const confidentialClientApplication = new ConfidentialClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
    clientSecret: CLIENT_SECRET,
  },
});
