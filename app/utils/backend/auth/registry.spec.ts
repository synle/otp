import { describe, expect, test } from "vitest";
import { getProvider } from "~/utils/backend/auth/registry";

describe("getProvider", () => {
  test("resolves the microsoft provider", () => {
    const provider = getProvider("microsoft");
    expect(provider?.id).toBe("microsoft");
    expect(provider?.callbackMode).toBe("post");
  });

  test("resolves the google provider", () => {
    const provider = getProvider("google");
    expect(provider?.id).toBe("google");
    expect(provider?.callbackMode).toBe("get");
  });

  test("returns null for unknown provider ids", () => {
    // Anything that doesn't exactly match a registered key — the route
    // surface uses this to refuse arbitrary URL segments.
    expect(getProvider("yahoo")).toBeNull();
    expect(getProvider("MICROSOFT")).toBeNull(); // case-sensitive on purpose
    expect(getProvider("../etc/passwd")).toBeNull();
    expect(getProvider("")).toBeNull();
    expect(getProvider(undefined)).toBeNull();
  });
});
