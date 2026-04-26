import type { LoaderArgs } from "@remix-run/node";
import { LoaderFunction, Response } from "@remix-run/node";
import { getSession } from "~/utils/backend/Session";

/**
 * GET `/api/auth/me` - return the currently authenticated user's profile.
 *
 * Used by the frontend `useMeProfile` hook to gate the UI on authentication.
 *
 * Responses:
 *   - 200 with the cached Graph `/me` profile when a session exists
 *   - 401 when no user is in the session
 *   - On unexpected error, returns the error string (axios on the frontend
 *     treats this as a 200, so the loader never throws to the boundary)
 */
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
