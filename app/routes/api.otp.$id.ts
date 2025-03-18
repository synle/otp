import type { ActionArgs } from "@remix-run/node";
import { Response } from "@remix-run/node";
import type { User } from "~/types.d.ts";
import {
  createOtpIdentity,
  deleteOtpIdentity,
  updateOtpIdentity,
} from "~/utils/backend/OtpIdentityDAO";
import { getSession } from "~/utils/backend/Session";

export async function action(args: ActionArgs) {
  const { request, params } = args;
  const id = params.id || "";
  const session = await getSession(request.headers.get("Cookie"));

  const user = session.get("user") as User;
  const email = user.mail;

  if (!email) {
    return new Response(`Unauthorized`, {
      status: 401,
    });
  }

  switch (args.request.method?.toUpperCase()) {
    case "PUT":
      // update link
      const updateRequest: Parameters<typeof updateOtpIdentity>[2] =
        await args.request.json();
      await updateOtpIdentity(email, id, updateRequest);

      return new Response("OK", {
        status: 200,
      });
    case "POST":
      // create link
      const createRequest: Parameters<typeof createOtpIdentity>[1] =
        await args.request.json();
      await createOtpIdentity(email, createRequest);

      return new Response("OK", {
        status: 200,
      });
    case "DELETE":
      await deleteOtpIdentity(email, id);

      return new Response("OK", {
        status: 200,
      });
    default:
      //TODO: throw not supported
      break;
  }
}
