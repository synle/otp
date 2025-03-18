import type { ActionArgs } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { authenticator } from "otplib";
import type { User } from "~/types.d.ts";
import { getSession } from "~/utils/backend/Session";

export async function action(args: ActionArgs) {
  const { request } = args;

  switch (args.request.method?.toUpperCase()) {
    case "POST":
      try {
        const session = await getSession(request.headers.get("Cookie"));

        const user = session.get("user") as User;
        const email = user.mail;

        if (!email) {
          return new Response(`Unauthorized`, {
            status: 401,
          });
        }

        const totp = (await args.request.json()).tolp;

        if (!totp) {
          return new Response(`Missing totp`, {
            status: 400,
          });
        }

        if (totp) {
          const url = new URL(totp);
          const secret = url.searchParams.get("secret");

          if (secret) {
            return authenticator.generate(secret);
          } else {
            return new Response(`Found Secret is empty`, {
              status: 400,
            });
          }
        }
      } catch (error) {
        return new Response(`Failed to otp_code - ${error}`, {
          status: 500,
        });
      }
      break;
    default:
      return new Response(`Method not supported`, {
        status: 400,
      });
  }
}
