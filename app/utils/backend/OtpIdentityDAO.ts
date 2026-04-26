import * as fs from "fs";
import { v4 as uuidv4 } from "uuid";

/**
 * A single TOTP identity record persisted on disk.
 */
export type OtpIdentity = {
  /** Stable v4 UUID used as the primary key. */
  id: string;
  /** Human-readable label (e.g. "Github (work)"). */
  name: string;
  /** Login secret material. Currently only TOTP `otpauth://` URIs are stored. */
  login: {
    /** Full `otpauth://totp/...` URI from which `authenticator.generate` derives the code. */
    totp: string;
  };
};

/**
 * Wire format used by both the file backing store and the `/api/otp` route.
 */
export type OtpIdentityResponse = {
  items: OtpIdentity[];
};

/**
 * Resolve the on-disk path that holds a user's identities.
 * Files are namespaced per user email so each authenticated user sees only their own list.
 *
 * @param email - The authenticated user's email (`session.user.mail`).
 * @returns A path relative to the process CWD.
 */
function _getOtpIdentityFilePath(email: string) {
  return `${email}.cred.json`;
}

/**
 * Persist `otpIdentityResponse` for `email` by overwriting the JSON file.
 * Pretty-printed with 2-space indentation so manual inspection is easy.
 *
 * @param email - The owning user's email.
 * @param otpIdentityResponse - Full list to persist (this is a full overwrite, not a merge).
 */
function _updateOtpIdentityFile(
  email: string,
  otpIdentityResponse: OtpIdentityResponse
) {
  fs.writeFileSync(
    _getOtpIdentityFilePath(email),
    JSON.stringify(otpIdentityResponse, null, 2)
  );
}

/**
 * Read the persisted identity list for a user.
 * Returns an empty list when the file does not exist or cannot be parsed,
 * which makes the first-write path implicit (no setup step required).
 *
 * @param email - The owning user's email.
 * @returns The persisted response, or `{ items: [] }` on miss.
 */
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

/**
 * Append a new identity to the user's list, assigning a fresh v4 UUID.
 *
 * @param email - The owning user's email.
 * @param body - Identity payload; an `id` in the body is overwritten by the generated UUID.
 * @throws When the underlying response cannot be loaded.
 */
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

/**
 * Patch the identity matching `id` with the values in `body`.
 * Items whose id does not match are returned untouched, so calling with an
 * unknown id is effectively a no-op.
 *
 * @param email - The owning user's email.
 * @param id - The id of the identity to update.
 * @param body - Fields to merge into the matched identity.
 */
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

/**
 * Remove the identity matching `id` from the user's list.
 * No-op when no item matches.
 *
 * @param email - The owning user's email.
 * @param id - The id of the identity to remove.
 */
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
