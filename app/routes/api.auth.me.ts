import type { LoaderArgs } from "@remix-run/node";
import { LoaderFunction, Response } from "@remix-run/node";
import { getSession } from "~/utils/backend/Session";

export const loader: LoaderFunction = async (args: LoaderArgs) => {
  const { request } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));

    if (session.get("user")) {
      return session.get("user");
    }

    return new Response(`Unauthorized`, {
      status: 401,
    });
  } catch (error) {
    return `Failed to get me - ${error}`;
  }
};
