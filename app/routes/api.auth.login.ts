import { json, redirect, LoaderFunction } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import {
  BASE_API_HOST,
  LOGIN_CALLBACK_URL,
  SCOPE,
  confidentialClientApplication,
} from "~/utils/backend/SSO";

export async function loader(args: LoaderArgs) {
  const { request } = args;

  let redirectUri = "";
  if (BASE_API_HOST) {
    redirectUri = BASE_API_HOST;
  } else {
    try {
      const url = new URL(request.url);
      redirectUri = url.host.includes("localhost")
        ? `${url.protocol}//${url.host}`
        : `https://${url.host}`;
    } catch (err) {}
  }

  redirectUri = `${redirectUri}${LOGIN_CALLBACK_URL}`;

  try {
    const loginUrl = await confidentialClientApplication.getAuthCodeUrl({
      scopes: SCOPE,
      redirectUri,
      state: redirectUri,
      prompt: "select_account",
    });
    return redirect(loginUrl);
  } catch (err) {
    return new Response(`Failed to log in - ${err}`, {
      status: 400,
    });
  }
}
