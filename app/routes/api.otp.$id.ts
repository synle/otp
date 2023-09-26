import { json, LoaderFunction, Response } from "@remix-run/node";
import type { LoaderArgs, ActionArgs } from "@remix-run/node";
import { getSession, SessionData } from "~/utils/backend/Session";
import { authenticator } from "otplib";
import { getOtpIdentityResponse } from "~/utils/backend/OtpIdentityDAO";
import { updateOtpIdentity } from "~/utils/backend/OtpIdentityDAO";

export async function loader(args: LoaderArgs) {
  const { request, params } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return new Response(`Unauthorized`, {
        status: 401,
      });
    }

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
  } catch (error) {
    return new Response(`Failed to getOtpIdentityResponse by id - ${error}`, {
      status: 500,
    });
  }
}

export async function action(args: ActionArgs) {
  const { request, params } = args;
  const id = params.id || "";
  const session = await getSession(request.headers.get("Cookie"));
  const email = session.get("email");

  if (!email) {
    return new Response(`Unauthorized`, {
      status: 401,
    });
  }

  switch (args.request.method?.toUpperCase()) {
    case "PUT":
      // update link
      const body: { name: string } = await args.request.json();
      await updateOtpIdentity(email, id, body);

      return new Response("OK", {
        status: 200,
      });
    case "DELETE":
      // TODO: implement me
      break;
    default:
      //TODO: throw not supported
      break;
  }

  return new Response(`Unauthorized`, {
    status: 401,
  });
}
