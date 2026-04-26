// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

/**
 * `<FontAwesomeIcon>` is the only thing BrandIcon renders, so we mock it to
 * forward the chosen icon name + color into the DOM as data attributes. That
 * lets us assert the matching logic without depending on FA's actual SVG
 * rendering or having to install jest-dom matchers.
 */
vi.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: (props: {
    icon: { iconName: string };
    style: { color: string };
  }) => (
    <span
      data-testid="fa-icon"
      data-icon-name={props.icon.iconName}
      data-color={props.style.color}
    />
  ),
}));

import BrandIcon from "~/components/TileItem/BrandIcon";

/**
 * Render `<BrandIcon icon={name} />` and read back the (icon-name, color)
 * pair that the component decided to use.
 *
 * Queries via `container.querySelector` rather than the bound `getByTestId`
 * so this stays correct when a single test calls it multiple times — the
 * top-level queries are bound to `document.body`, which accumulates across
 * renders inside the same test.
 */
function resolveBrand(name: string): { iconName: string; color: string } {
  const { container } = render(<BrandIcon icon={name} />);
  const node = container.querySelector('[data-testid="fa-icon"]');
  return {
    iconName: node?.getAttribute("data-icon-name") || "",
    color: node?.getAttribute("data-color") || "",
  };
}

describe("BrandIcon", () => {
  test("matches a known brand by exact name", () => {
    const { iconName } = resolveBrand("Github");
    expect(iconName).toBe("github");
  });

  test("matches case-insensitively", () => {
    expect(resolveBrand("github").iconName).toBe("github");
    expect(resolveBrand("GITHUB").iconName).toBe("github");
  });

  test("matches a brand keyword embedded in a longer label", () => {
    // The user can name an entry "Github (work)" - the substring match
    // should still resolve to the github icon.
    expect(resolveBrand("Github (work)").iconName).toBe("github");
  });

  test("picks the brand's mapped color, not the fallback", () => {
    const fallback = resolveBrand("totally-unknown-brand");
    const github = resolveBrand("Github");
    expect(github.color).not.toBe(fallback.color);
    expect(github.color).toBeTruthy();
  });

  test("falls back to the generic user icon for unknown brands", () => {
    const { iconName } = resolveBrand("totally-unknown-brand");
    expect(iconName).toBe("user");
  });

  test("returns the same icon for identical inputs (memoization sanity check)", () => {
    expect(resolveBrand("Google").iconName).toBe("google");
    expect(resolveBrand("Google").iconName).toBe("google");
  });

  test("resolves several distinct brand keywords", () => {
    // Cross-check a handful of mappings so renaming the table is caught.
    expect(resolveBrand("Linkedin").iconName).toBe("linkedin");
    expect(resolveBrand("Microsoft").iconName).toBe("microsoft");
    expect(resolveBrand("Facebook").iconName).toBe("facebook");
    expect(resolveBrand("Dropbox").iconName).toBe("dropbox");
  });

  test("matches the first brand in declaration order when multiple keywords appear", () => {
    // ICON_MAPPINGS is iterated via Object.keys, so the first match wins.
    // "Google" appears before "Microsoft" in the table.
    expect(resolveBrand("Google + Microsoft demo").iconName).toBe("google");
  });
});
