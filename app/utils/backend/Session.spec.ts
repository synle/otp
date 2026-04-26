import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { _resolveSessionSecret } from "~/utils/backend/Session";

/**
 * `_resolveSessionSecret` runs once at module load to pick which secret
 * signs the session cookie. The function is exposed (with a leading
 * underscore) specifically so we can verify the production-hard-fail and
 * dev-fallback behaviors without restarting the test runner.
 */
describe("_resolveSessionSecret", () => {
  beforeEach(() => {
    vi.stubEnv("SESSION_SECRET", "");
    vi.stubEnv("AAD_SSO_CLIENT_VALUE", "");
    vi.stubEnv("NODE_ENV", "test");
  });
  afterEach(() => vi.unstubAllEnvs());

  test("prefers SESSION_SECRET over the AAD legacy fallback", () => {
    vi.stubEnv("SESSION_SECRET", "from-session-secret");
    vi.stubEnv("AAD_SSO_CLIENT_VALUE", "from-aad");
    expect(_resolveSessionSecret()).toBe("from-session-secret");
  });

  test("falls back to AAD_SSO_CLIENT_VALUE when SESSION_SECRET is unset", () => {
    vi.stubEnv("AAD_SSO_CLIENT_VALUE", "from-aad-only");
    expect(_resolveSessionSecret()).toBe("from-aad-only");
  });

  test("uses the dev literal when nothing is set and NODE_ENV is not production", () => {
    expect(_resolveSessionSecret()).toBe("s3cret1");
  });

  test("hard-fails in production when neither env var is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => _resolveSessionSecret()).toThrow(/SESSION_SECRET/);
  });

  test("does NOT hard-fail in production when SESSION_SECRET is set", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "prod-secret");
    expect(_resolveSessionSecret()).toBe("prod-secret");
  });
});
