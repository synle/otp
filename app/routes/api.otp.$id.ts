import { json, LoaderFunction, Response } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { getSession, SessionData } from "~/utils/backend/Session";
import { authenticator } from "otplib";
import { getOtpIdentityResponse } from "~/routes/api.otp";

export async function loader(args: LoaderArgs) {
  const { request, params } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (email) {
      if (params.id) {
        const { items } = getOtpIdentityResponse(email);
        const matched = items.find((item) => item.id === params.id);

        if (matched) {
          const url = new URL(matched.login.totp);
          const secret = url.searchParams.get("secret");

          if (secret) {
            return authenticator.generate(secret);
          } else {
            return new Response(`Found Secret is empty`, {
              status: 400,
            });
          }
        } else {
          return new Response(`Item Not found`, {
            status: 404,
          });
        }
      }
    }

    return new Response(`Unauthorized`, {
      status: 401,
    });
  } catch (error) {
    return new Response(`Failed to getOtpIdentityResponse by id - ${error}`, {
      status: 500,
    });
  }
}
