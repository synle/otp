import type { LoaderArgs } from "@remix-run/node";
import { json, Response } from "@remix-run/node";
import type { User } from "~/types.d.ts";
import { getOtpIdentityResponse } from "~/utils/backend/OtpIdentityDAO";
import { getSession } from "~/utils/backend/Session";

/**
 * GET `/api/otp` - return the authenticated user's full identity list.
 *
 * Responses:
 *   - 200 with `OtpIdentityResponse` JSON when the session has a user.
 *   - 401 when the request has no valid session.
 *   - 500 on any unexpected failure reading the persisted file.
 */
export async function loader(args: LoaderArgs) {
  const { request } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const user = session.get("user") as User | undefined;

    if (!user?.email) {
      return new Response(`Unauthorized`, { status: 401 });
    }

    return json(await getOtpIdentityResponse(user));
  } catch (error) {
    return new Response(`Failed to getOtpIdentityResponse - ${error}`, {
      status: 500,
    });
  }
}
