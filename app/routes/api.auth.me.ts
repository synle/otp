import { json, LoaderFunction, Response } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { getSession, SessionData } from "~/utils/backend/Session";

export type MeProfile = SessionData & {
  initials: string;
};

function getInitials(fullName: string) {
  const names = fullName.split(" ");
  return names
    .map((name) => name.charAt(0))
    .join("")
    .toUpperCase();
}

export const loader: LoaderFunction = async (args: LoaderArgs) => {
  const { request } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const sessionData = {
      requestId: session.get("requestId") || "",
      fullName: session.get("fullName") || "",
      jobTitle: session.get("jobTitle") || "",
      email: session.get("email") || "",
      username: session.get("username") || "",
    };

    if (sessionData.requestId) {
      return json({
        ...sessionData,
        initials: getInitials(sessionData.fullName),
      });
    }

    return new Response(`Unauthorized`, {
      status: 401,
    });
  } catch (error) {
    return `Failed to get me - ${error}`;
  }
};
