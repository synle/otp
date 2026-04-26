import axios from "axios";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  exchangeGoogleCode,
  fetchGoogleUserInfo,
  googleProvider,
  normalizeGoogleProfile,
} from "~/utils/backend/auth/google";

/**
 * The provider talks to Google over axios. We mock the two methods we use
 * (`get`, `post`) rather than spinning up a fake HTTP server — the goal is
 * to verify the request shape and the response handling, not the network.
 */
describe("auth/google", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "test-client-id");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "test-client-secret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("normalizeGoogleProfile", () => {
    test("returns a User with lowercased email and provider=google", () => {
      const user = normalizeGoogleProfile({
        id: "google-sub-123",
        email: "User@Example.COM",
        name: "Example User",
      });

      expect(user).toEqual({
        id: "google-sub-123",
        email: "user@example.com",
        displayName: "Example User",
        provider: "google",
      });
    });

    test("falls back to email for displayName and id when missing", () => {
      const user = normalizeGoogleProfile({ email: "x@y.com" });
      expect(user.id).toBe("x@y.com");
      expect(user.displayName).toBe("x@y.com");
    });

    test("throws when email is missing — the vault is keyed by email", () => {
      expect(() =>
        normalizeGoogleProfile({ id: "google-sub", name: "Anon" })
      ).toThrow(/missing email/);
    });
  });

  describe("buildAuthUrl", () => {
    test("includes client_id, redirect_uri, scope, state, response_type=code", async () => {
      const url = await googleProvider.buildAuthUrl({
        redirectUri: "https://app.example.com/cb",
        state: "nonce-abc",
      });

      const parsed = new URL(url);
      expect(parsed.origin + parsed.pathname).toBe(
        "https://accounts.google.com/o/oauth2/v2/auth"
      );
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "https://app.example.com/cb"
      );
      expect(parsed.searchParams.get("response_type")).toBe("code");
      expect(parsed.searchParams.get("state")).toBe("nonce-abc");
      expect(parsed.searchParams.get("scope")).toBe("openid email profile");
      expect(parsed.searchParams.get("prompt")).toBe("select_account");
    });

    test("throws when client credentials are not configured", async () => {
      vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "");
      await expect(
        googleProvider.buildAuthUrl({
          redirectUri: "https://x/cb",
          state: "n",
        })
      ).rejects.toThrow(/GOOGLE_OAUTH_CLIENT_ID/);
    });
  });

  describe("exchangeGoogleCode", () => {
    test("POSTs the auth code with the form-encoded body Google expects", async () => {
      const post = vi
        .spyOn(axios, "post")
        .mockResolvedValue({ data: { access_token: "at-123" } });

      const result = await exchangeGoogleCode({
        code: "abc-code",
        redirectUri: "https://app.example.com/cb",
        clientId: "cid",
        clientSecret: "csec",
      });

      expect(result).toEqual({ accessToken: "at-123" });
      expect(post).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      );

      // Decode the URLSearchParams body and check every required field.
      const body = new URLSearchParams((post.mock.calls[0] as any[])[1]);
      expect(body.get("code")).toBe("abc-code");
      expect(body.get("client_id")).toBe("cid");
      expect(body.get("client_secret")).toBe("csec");
      expect(body.get("redirect_uri")).toBe("https://app.example.com/cb");
      expect(body.get("grant_type")).toBe("authorization_code");
    });

    test("throws when the token response has no access_token", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({ data: {} });

      await expect(
        exchangeGoogleCode({
          code: "x",
          redirectUri: "y",
          clientId: "c",
          clientSecret: "s",
        })
      ).rejects.toThrow(/missing access_token/);
    });
  });

  describe("fetchGoogleUserInfo", () => {
    test("GETs userinfo with a Bearer token", async () => {
      const get = vi.spyOn(axios, "get").mockResolvedValue({
        data: { id: "g-1", email: "x@y.com", name: "X" },
      });

      const profile = await fetchGoogleUserInfo("the-access-token");

      expect(profile.email).toBe("x@y.com");
      expect(get).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer the-access-token",
          }),
        })
      );
    });
  });

  describe("authenticate (full flow)", () => {
    test("exchanges the code, fetches userinfo, and returns the normalized user", async () => {
      vi.spyOn(axios, "post").mockResolvedValue({
        data: { access_token: "at-456" },
      });
      vi.spyOn(axios, "get").mockResolvedValue({
        data: {
          id: "google-sub-456",
          email: "Real@Example.com",
          name: "Real User",
        },
      });

      const user = await googleProvider.authenticate({
        code: "the-code",
        redirectUri: "https://app.example.com/cb",
      });

      expect(user).toEqual({
        id: "google-sub-456",
        email: "real@example.com",
        displayName: "Real User",
        provider: "google",
      });
    });

    test("rejects when client credentials are not configured", async () => {
      vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "");
      await expect(
        googleProvider.authenticate({
          code: "c",
          redirectUri: "https://x/cb",
        })
      ).rejects.toThrow(/GOOGLE_OAUTH_CLIENT/);
    });
  });
});
