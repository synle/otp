import { json, Response } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { getSession } from "~/utils/backend/Session";
import { getOtpIdentityResponse } from "~/utils/backend/OtpIdentityDAO";


export async function loader(args: LoaderArgs) {
  const { request } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (email) {
      return json(getOtpIdentityResponse(email));
    }

    return new Response(`Unauthorized`, {
      status: 401,
    });
  } catch (error) {
    return new Response(`Failed to getOtpIdentityResponse - ${error}`, {
      status: 500,
    });
  }
}
