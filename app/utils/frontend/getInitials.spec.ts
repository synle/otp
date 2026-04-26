import { describe, expect, test } from "vitest";

import { getInitials } from "~/utils/frontend/getInitials";

describe("getInitials", () => {
  test("returns the first letter of every space-separated token, uppercased", () => {
    expect(getInitials("Sy Le")).toBe("SL");
    expect(getInitials("Ada B Lovelace")).toBe("ABL");
  });

  test("uppercases lowercase input", () => {
    expect(getInitials("sy le")).toBe("SL");
  });

  test("handles a single name", () => {
    expect(getInitials("Cher")).toBe("C");
  });

  test("returns an empty string for an empty input", () => {
    expect(getInitials("")).toBe("");
  });

  test("ignores empty tokens caused by extra whitespace", () => {
    // Extra spaces produce empty tokens; charAt(0) on those is "" so they
    // don't add stray characters to the result.
    expect(getInitials("  Sy   Le  ")).toBe("SL");
  });

  test("works with unicode names (BMP code points)", () => {
    expect(getInitials("Élise Dupont")).toBe("ÉD");
  });
});
