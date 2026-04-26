import type { ActionArgs } from "@remix-run/node";
import { Response } from "@remix-run/node";
import type { User } from "~/types.d.ts";
import {
  createOtpIdentity,
  deleteOtpIdentity,
  updateOtpIdentity,
} from "~/utils/backend/OtpIdentityDAO";
import { getSession } from "~/utils/backend/Session";

/**
 * Action handler for `/api/otp/:id` - all mutating operations on the user's
 * identity list are routed through here.
 *
 * Method matrix:
 *   - PUT    -> update the identity matching `:id`
 *   - POST   -> create a new identity (the `:id` segment is ignored, e.g. `/api/otp/new`)
 *   - DELETE -> remove the identity matching `:id`
 *
 * Returns 401 when the session has no authenticated user.
 */
export async function action(args: ActionArgs) {
  const { request, params } = args;
  const id = params.id || "";
  const session = await getSession(request.headers.get("Cookie"));
  const user = session.get("user") as User | undefined;

  if (!user?.email) {
    return new Response(`Unauthorized`, { status: 401 });
  }

  switch (args.request.method?.toUpperCase()) {
    case "PUT":
      const updateRequest: Parameters<typeof updateOtpIdentity>[2] =
        await args.request.json();
      await updateOtpIdentity(user, id, updateRequest);
      return new Response("OK", { status: 200 });
    case "POST":
      const createRequest: Parameters<typeof createOtpIdentity>[1] =
        await args.request.json();
      await createOtpIdentity(user, createRequest);
      return new Response("OK", { status: 200 });
    case "DELETE":
      await deleteOtpIdentity(user, id);
      return new Response("OK", { status: 200 });
    default:
      //TODO: throw not supported
      break;
  }
}
