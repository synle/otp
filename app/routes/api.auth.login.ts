import { redirect } from "@remix-run/node";

/**
 * GET `/api/auth/login` - back-compat shim.
 *
 * The login flow used to live here when Microsoft was the only provider.
 * It now lives at `/api/auth/:provider/login`, but bookmarks and old links
 * still hit this URL — bounce them to the Microsoft variant so the user
 * lands at the same prompt they used to.
 */
export async function loader() {
  return redirect("/api/auth/microsoft/login");
}
