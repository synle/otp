import { json, redirect, LoaderFunction } from "@remix-run/node";
import {
  REDIRECT_PATH,
  SCOPE,
  confidentialClientApplication,
} from "~/utils/backend/SSO";

export const loader: LoaderFunction = async () => {
  try {
    const loginUrl = await confidentialClientApplication.getAuthCodeUrl({
      scopes: SCOPE,
      redirectUri: REDIRECT_PATH,
    });
    return redirect(loginUrl);
  } catch (err) {
    return new Response(`Failed to log in - ${err}`, {
      status: 400,
    });
  }
};
