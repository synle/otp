import { redirect, Response, LoaderFunction } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { getSession, destroySession } from "~/utils/backend/Session";

export const loader: LoaderFunction = async (args: LoaderArgs) => {
  const { request } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect(`/`, {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  } catch (err) {
    return new Response(`Failed to log in - ${err}`, {
      status: 400,
    });
  }
};
