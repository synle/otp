import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { consumeAuthState, startAuthState } from "~/utils/backend/auth/state";

/**
 * `state.ts` reads `process.env.SESSION_SECRET` *at module load*. We pin it
 * here so the cookie signing is stable across tests, and so we exercise the
 * non-fallback path (the literal "s3cret1" only fires in dev w/ no env).
 */
describe("auth/state", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "test-secret-for-state-spec");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("startAuthState", () => {
    test("returns a fresh nonce and a Set-Cookie header", async () => {
      const out = await startAuthState({
        providerId: "microsoft",
        redirectUri: "https://example.com/cb",
      });

      expect(out.state).toMatch(/^[A-Za-z0-9_-]+$/); // base64url
      expect(out.state.length).toBeGreaterThanOrEqual(32);
      expect(out.setCookie).toContain("__auth_state=");
      expect(out.setCookie.toLowerCase()).toContain("httponly");
      expect(out.setCookie.toLowerCase()).toContain("samesite=lax");
    });

    test("issues a different nonce on each call", async () => {
      const a = await startAuthState({
        providerId: "microsoft",
        redirectUri: "https://x/cb",
      });
      const b = await startAuthState({
        providerId: "microsoft",
        redirectUri: "https://x/cb",
      });
      expect(a.state).not.toBe(b.state);
    });
  });

  describe("consumeAuthState", () => {
    /**
     * Helper: simulate the browser turning a Set-Cookie into a Cookie header
     * on the next request. Strip attributes after the first `;` so we get
     * just `name=value`.
     */
    function setCookieToCookie(setCookie: string): string {
      return setCookie.split(";")[0];
    }

    test("returns the stored state when nonce + provider match", async () => {
      const { state, setCookie } = await startAuthState({
        providerId: "microsoft",
        redirectUri: "https://example.com/cb",
      });

      const consumed = await consumeAuthState({
        cookieHeader: setCookieToCookie(setCookie),
        urlState: state,
        providerId: "microsoft",
      });

      expect(consumed).not.toBeNull();
      expect(consumed!.state.providerId).toBe("microsoft");
      expect(consumed!.state.redirectUri).toBe("https://example.com/cb");
      // The clear cookie should have an expired-in-the-past attribute or
      // an empty value; either way it should not contain the original nonce.
      expect(consumed!.clearCookie).not.toContain(state);
    });

    test("returns null when the state nonce does not match the cookie", async () => {
      const { setCookie } = await startAuthState({
        providerId: "microsoft",
        redirectUri: "https://example.com/cb",
      });

      const consumed = await consumeAuthState({
        cookieHeader: setCookieToCookie(setCookie),
        urlState: "tampered-nonce",
        providerId: "microsoft",
      });

      expect(consumed).toBeNull();
    });

    test("returns null when the provider does not match the cookie", async () => {
      // Started a microsoft flow, but callback is hitting the google route.
      const { state, setCookie } = await startAuthState({
        providerId: "microsoft",
        redirectUri: "https://example.com/cb",
      });

      const consumed = await consumeAuthState({
        cookieHeader: setCookieToCookie(setCookie),
        urlState: state,
        providerId: "google",
      });

      expect(consumed).toBeNull();
    });

    test("returns null when there is no cookie at all", async () => {
      const consumed = await consumeAuthState({
        cookieHeader: null,
        urlState: "anything",
        providerId: "microsoft",
      });
      expect(consumed).toBeNull();
    });

    test("returns null when the URL state param is missing", async () => {
      const { setCookie } = await startAuthState({
        providerId: "microsoft",
        redirectUri: "https://example.com/cb",
      });

      const consumed = await consumeAuthState({
        cookieHeader: setCookieToCookie(setCookie),
        urlState: null,
        providerId: "microsoft",
      });

      expect(consumed).toBeNull();
    });
  });
});
