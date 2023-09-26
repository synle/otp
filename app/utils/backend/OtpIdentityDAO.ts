import * as fs from "fs";

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

export function getOtpIdentityResponse(email: string) {
  return JSON.parse(
    fs.readFileSync(_getOtpIdentityFilePath(email), "utf-8")
  ) as OtpIdentityResponse;
}

export async function updateOtpIdentity(
  email: string,
  id: string,
  body: Partial<OtpIdentity> & { name: string }
) {
  const otpIdentityResponse = getOtpIdentityResponse(email);

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

  fs.writeFileSync(
    _getOtpIdentityFilePath(email),
    JSON.stringify(otpIdentityResponse, null, 2)
  );
}
