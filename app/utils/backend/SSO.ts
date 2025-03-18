import { ConfidentialClientApplication } from "@azure/msal-node";

// configs for SSO
export const BASE_API_HOST = process.env.AAD_BASE_HOST_URL;
export const LOGIN_URL = "/api/auth/login";
export const LOGIN_CALLBACK_URL = "/api/auth/login_callback";

export const TENANT_ID = process.env["AAD_TENANT_ID"] || "common";
export const CLIENT_ID = process.env["AAD_SSO_CLIENT_ID"] || "";
export const CLIENT_SECRET = process.env["AAD_SSO_CLIENT_VALUE"] || "";
export const AUTHORITY = `https://login.microsoftonline.com/${TENANT_ID}`;
export const SCOPE = ["user.read"];

// msal init
export const confidentialClientApplication = new ConfidentialClientApplication({
  auth: {
    clientId: CLIENT_ID,
    authority: AUTHORITY,
    clientSecret: CLIENT_SECRET,
  },
});
