import type { ActionArgs } from "@remix-run/node";
import { Response } from "@remix-run/node";
import { authenticator } from "otplib";
import type { User } from "~/types.d.ts";
import { getSession } from "~/utils/backend/Session";

/**
 * POST `/api/otp_code` - given an `otpauth://...` URI in the body, return the
 * current 6-digit TOTP code for it.
 *
 * The URI's `secret` query param is fed to `otplib.authenticator.generate`.
 * The body field is intentionally named `tolp` to match the matching typo in
 * the frontend hook (`useOtpCode`); both sides must change together.
 *
 * Responses:
 *   - 200 with the code as the body
 *   - 400 when `tolp` is missing or the URI has no `secret`
 *   - 401 on missing session
 *   - 500 on unexpected failure
 */
export async function action(args: ActionArgs) {
  const { request } = args;

  switch (args.request.method?.toUpperCase()) {
    case "POST":
      try {
        const session = await getSession(request.headers.get("Cookie"));
        const user = session.get("user") as User | undefined;

        if (!user?.email) {
          return new Response(`Unauthorized`, { status: 401 });
        }

        const totp = (await args.request.json()).tolp;

        if (!totp) {
          return new Response(`Missing totp`, { status: 400 });
        }

        const url = new URL(totp);
        const secret = url.searchParams.get("secret");

        if (secret) {
          return authenticator.generate(secret);
        }
        return new Response(`Found Secret is empty`, { status: 400 });
      } catch (error) {
        return new Response(`Failed to otp_code - ${error}`, { status: 500 });
      }
    default:
      return new Response(`Method not supported`, { status: 400 });
  }
}
