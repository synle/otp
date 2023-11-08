import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";

export type OtpIdentity = {
  id: string;
  name: string;
  login: {
    totp: string;
  };
};

export type OtpIdentityResponse = {
  items: OtpIdentity[];
};

function _getOtpIdentityFilePath(email: string) {
  return `${email}.cred.json`;
}

function _updateOtpIdentityFile(
  email: string,
  otpIdentityResponse: OtpIdentityResponse
) {
  fs.writeFileSync(
    _getOtpIdentityFilePath(email),
    JSON.stringify(otpIdentityResponse, null, 2)
  );
}

export function getOtpIdentityResponse(email: string) {
  try {
    return JSON.parse(
      fs.readFileSync(_getOtpIdentityFilePath(email), "utf-8")
    ) as OtpIdentityResponse;
  } catch (err) {
    return {
      items: [],
    };
  }
}

export async function createOtpIdentity(
  email: string,
  body: Partial<OtpIdentity> & {
    name: string;
    login: {
      totp: string;
    };
  }
) {
  const otpIdentityResponse = await getOtpIdentityResponse(email);

  if (!otpIdentityResponse) {
    throw "OtpIdentityFile not found";
  }

  otpIdentityResponse.items.push({
    id: uuidv4(),
    ...body,
  });

  // update the file
  _updateOtpIdentityFile(email, otpIdentityResponse);
}

export async function updateOtpIdentity(
  email: string,
  id: string,
  body: Partial<OtpIdentity> & {
    name: string;
    login: {
      totp: string;
    };
  }
) {
  const otpIdentityResponse = await getOtpIdentityResponse(email);

  if (!otpIdentityResponse) {
    throw "OtpIdentityFile not found";
  }

  // TODO: handle cases where the patch can't find matching id

  // doing the update...
  otpIdentityResponse.items = otpIdentityResponse.items.map((item) => {
    if (item.id === id) {
      item = { ...item, ...body };
    }

    return item;
  });

  // update the file
  _updateOtpIdentityFile(email, otpIdentityResponse);
}

export async function deleteOtpIdentity(email: string, id: string) {
  const otpIdentityResponse = await getOtpIdentityResponse(email);

  if (!otpIdentityResponse) {
    throw "OtpIdentityFile not found";
  }

  // TODO: handle cases where the patch can't find matching id

  // doing the update...
  otpIdentityResponse.items = otpIdentityResponse.items.filter((item) => {
    return item.id !== id;
  });

  // update the file
  _updateOtpIdentityFile(email, otpIdentityResponse);
}
