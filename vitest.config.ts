import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest configuration.
 *
 * Aligned with the conventions used in sister project `sqlui-native`:
 *   - `globals: true` so tests can use `describe` / `test` / `expect` without imports
 *   - test files match `**\/*.spec.{ts,tsx}`
 *   - coverage uses the v8 provider with text + json-summary reporters
 *
 * Path alias `~/*` mirrors the Remix tsconfig setting so tests can import
 * from `~/utils/...` exactly like app code does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./app"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    testTimeout: 10000,
    include: ["app/**/*.spec.{ts,tsx}", "tests/**/*.spec.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/build/**", "e2e/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["app/utils/**/*.{ts,tsx}"],
      exclude: [
        "app/utils/**/*.d.ts",
        "**/*.spec.{ts,tsx}",
        "**/node_modules/**",
      ],
    },
  },
});
