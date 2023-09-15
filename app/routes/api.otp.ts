import { json, LoaderFunction, Response } from "@remix-run/node";
import type { LoaderArgs } from "@remix-run/node";
import { getSession, SessionData } from "~/utils/backend/Session";
import * as fs from "fs";

export type OtpIdentity = {
  id: string;
  organizationId?: string;
  folderId: string;
  type: number;
  reprompt: number;
  name: string;
  notes?: string;
  favorite: boolean;
  login: {
    username?: string;
    password?: string;
    totp: string;
  };
  collectionIds?: string;
};

export type OtpIdentityResponse = {
  encrypted: boolean;
  folders: Array<{
    id: string;
    name: string;
  }>;
  items: OtpIdentity[];
};

export function getOtpIdentityResponse(email: string) {
  return JSON.parse(
    fs.readFileSync(`${email}.cred.json`, "utf-8")
  ) as OtpIdentityResponse;
}

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
