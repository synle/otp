import { describe, expect, test } from "vitest";
import { normalizeMicrosoftProfile } from "~/utils/backend/auth/microsoft";

describe("normalizeMicrosoftProfile", () => {
  test("uses `mail` when present", () => {
    const user = normalizeMicrosoftProfile({
      id: "graph-id-1",
      mail: "User@Example.COM",
      userPrincipalName: "user@example.onmicrosoft.com",
      displayName: "Example User",
    });

    expect(user).toEqual({
      id: "graph-id-1",
      email: "user@example.com",
      displayName: "Example User",
      provider: "microsoft",
    });
  });

  test("falls back to `userPrincipalName` when `mail` is null", () => {
    // Personal MSAs commonly have `mail: null` even though the upn is fine.
    const user = normalizeMicrosoftProfile({
      id: "graph-id-2",
      mail: null,
      userPrincipalName: "MSA-USER@outlook.com",
      displayName: "MSA User",
    });

    expect(user.email).toBe("msa-user@outlook.com");
    expect(user.id).toBe("graph-id-2");
  });

  test("throws when both mail and userPrincipalName are missing", () => {
    expect(() =>
      normalizeMicrosoftProfile({
        id: "graph-id-3",
        mail: null,
        userPrincipalName: null,
        displayName: "Whoever",
      })
    ).toThrow(/missing both mail and userPrincipalName/);
  });

  test("falls back to email for displayName when missing", () => {
    const user = normalizeMicrosoftProfile({
      id: "graph-id-4",
      mail: "x@y.com",
      userPrincipalName: null,
      displayName: null,
    });
    expect(user.displayName).toBe("x@y.com");
  });

  test("falls back to email for id when missing", () => {
    const user = normalizeMicrosoftProfile({
      mail: "x@y.com",
      userPrincipalName: null,
      displayName: "X",
    });
    expect(user.id).toBe("x@y.com");
  });

  test("trims surrounding whitespace from the email", () => {
    const user = normalizeMicrosoftProfile({
      id: "id",
      mail: "  spaced@x.com  ",
      displayName: "S",
    });
    expect(user.email).toBe("spaced@x.com");
  });
});
