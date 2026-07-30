import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { computeRedirectUri } from "~/utils/backend/auth/redirectUri";

describe("computeRedirectUri", () => {
  beforeEach(() => {
    // Start each test from a clean slate; tests opt in to the env var they care about.
    vi.stubEnv("MICROSOFT_REDIRECT_URL", "");
    vi.stubEnv("GOOGLE_REDIRECT_URL", "");
    vi.stubEnv("AAD_REDIRECT_URL", "");
    vi.stubEnv("AUTH_BASE_HOST_URL", "");
    vi.stubEnv("AAD_SSO_BASE_HOST_URL", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  const callbackPath = "/api/auth/microsoft/login_callback";

  test("prefers per-provider env override", () => {
    vi.stubEnv("MICROSOFT_REDIRECT_URL", "https://app.example.com/cb-ms");
    expect(
      computeRedirectUri({
        request: new Request("http://localhost:3000/api/auth/microsoft/login"),
        providerId: "microsoft",
        callbackPath,
      }),
    ).toBe("https://app.example.com/cb-ms");
  });

  test("legacy AAD_REDIRECT_URL still works for microsoft", () => {
    vi.stubEnv("AAD_REDIRECT_URL", "https://legacy.example.com/cb");
    expect(
      computeRedirectUri({
        request: new Request("http://localhost:3000/api/auth/microsoft/login"),
        providerId: "microsoft",
        callbackPath,
      }),
    ).toBe("https://legacy.example.com/cb");
  });

  test("base host env builds redirect URL with the callback path", () => {
    vi.stubEnv("AUTH_BASE_HOST_URL", "https://app.example.com");
    expect(
      computeRedirectUri({
        request: new Request("http://localhost:3000/api/auth/google/login"),
        providerId: "google",
        callbackPath: "/api/auth/google/login_callback",
      }),
    ).toBe("https://app.example.com/api/auth/google/login_callback");
  });

  test("base host env strips trailing slash before joining", () => {
    vi.stubEnv("AUTH_BASE_HOST_URL", "https://app.example.com/");
    expect(
      computeRedirectUri({
        request: new Request("http://localhost:3000/x"),
        providerId: "google",
        callbackPath: "/api/auth/google/login_callback",
      }),
    ).toBe("https://app.example.com/api/auth/google/login_callback");
  });

  test("falls back to request URL on localhost (keeps http)", () => {
    expect(
      computeRedirectUri({
        request: new Request("http://localhost:3000/api/auth/microsoft/login"),
        providerId: "microsoft",
        callbackPath,
      }),
    ).toBe("http://localhost:3000/api/auth/microsoft/login_callback");
  });

  test("falls back to request URL on non-localhost (forces https)", () => {
    expect(
      computeRedirectUri({
        request: new Request("http://app.example.com/api/auth/google/login"),
        providerId: "google",
        callbackPath: "/api/auth/google/login_callback",
      }),
    ).toBe("https://app.example.com/api/auth/google/login_callback");
  });
});
