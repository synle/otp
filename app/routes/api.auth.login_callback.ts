import { redirect, LoaderFunction } from "@remix-run/node";
import { SCOPE, confidentialClientApplication } from "~/utils/backend/SSO";
import type { LoaderArgs } from "@remix-run/node";
import { getSession, commitSession } from "~/utils/backend/Session";
import axios from "axios";

export const loader: LoaderFunction = async (args: LoaderArgs) => {
  const { request } = args;
  try {
    const url = new URL(request.url);
    const redirectUri = url.searchParams.get("state") || "";

    const response = await confidentialClientApplication.acquireTokenByCode({
      scopes: SCOPE,
      redirectUri,
      ...{
        code: url.searchParams.get("code") || "",
        client_info: url.searchParams.get("client_info") || "",
        session_state: url.searchParams.get("session_state") || "",
      },
    });

    const { requestId, accessToken } = response;

    // do the me api to get profile
    const { data: meProfile } = await axios.get(
      `https://graph.microsoft.com/v1.0/me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );

    const session = await getSession(request.headers.get("Cookie"));

    session.set("requestId", `${Date.now()}-${requestId}`);
    session.set("fullName", meProfile.displayName);
    session.set("jobTitle", meProfile.jobTitle);
    session.set("email", meProfile.mail);
    session.set("username", meProfile.userPrincipalName);

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
