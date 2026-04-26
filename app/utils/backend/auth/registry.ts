import type { AuthProviderId } from "~/types.d.ts";
import { googleProvider } from "./google";
import { microsoftProvider } from "./microsoft";
import type { AuthProvider } from "./types";

/**
 * Lookup table of registered SSO providers.
 *
 * Add new providers here. The route layer takes the `:provider` URL segment
 * and runs it through `getProvider` — anything not in this map is rejected
 * before it gets near the OAuth flow.
 */
const _PROVIDERS: Record<AuthProviderId, AuthProvider> = {
  microsoft: microsoftProvider,
  google: googleProvider,
};

/**
 * Resolve a provider by its URL id.
 *
 * Returns `null` for any input that is not an exact match for a registered
 * provider id, including arbitrary user-supplied strings from `params`.
 */
export function getProvider(id: string | undefined): AuthProvider | null {
  if (!id) return null;
  return _PROVIDERS[id as AuthProviderId] || null;
}
