import { ActionFunction, redirect } from "@remix-run/node";
import axios from "axios";
import { commitSession, getSession } from "~/utils/backend/Session";
import { SCOPE, confidentialClientApplication } from "~/utils/backend/SSO";

async function _getUserInformation(accessToken: string) {
  // do the me api to get profile
  const { data: aadMeProfile } = await axios.get(
    `https://graph.microsoft.com/v1.0/me`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    }
  );

  return aadMeProfile;
}

export let action: ActionFunction = async ({ request }) => {
  const formData = new URLSearchParams(await request.text());

  try {
    const url = new URL(request.url);
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
    const user = await _getUserInformation(accessToken);

    // set cookies
    const session = await getSession(request.headers.get("Cookie"));
    session.set("access_token", accessToken);
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
