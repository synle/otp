import type { LoaderArgs } from "@remix-run/node";
import { json, Response } from "@remix-run/node";
import type { User } from "~/types.d.ts";
import { getOtpIdentityResponse } from "~/utils/backend/OtpIdentityDAO";
import { getSession } from "~/utils/backend/Session";

export async function loader(args: LoaderArgs) {
  const { request } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));

    const user = session.get("user") as User;
    const email = user.mail;

    if (email) {
      return json(await getOtpIdentityResponse(email));
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
