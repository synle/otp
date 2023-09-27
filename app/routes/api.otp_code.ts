import { json, LoaderFunction, Response } from "@remix-run/node";
import type { LoaderArgs, ActionArgs } from "@remix-run/node";
import { getSession, SessionData } from "~/utils/backend/Session";
import { authenticator } from "otplib";
import { getOtpIdentityResponse } from "~/utils/backend/OtpIdentityDAO";
import {
  deleteOtpIdentity,
  updateOtpIdentity,
  createOtpIdentity,
} from "~/utils/backend/OtpIdentityDAO";

export async function loader(args: LoaderArgs) {
  const { request } = args;
  try {
    const session = await getSession(request.headers.get("Cookie"));
    const email = session.get("email");

    if (!email) {
      return new Response(`Unauthorized`, {
        status: 401,
      });
    }

    const url = new URL(request.url);
    const totp = (url.searchParams.get("totp") || "").trim();

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
}
