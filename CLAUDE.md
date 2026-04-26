# CLAUDE.md

## GitHub Raw File URLs

When fetching raw file content from GitHub repos, always use `raw.githubusercontent.com` (CORS-friendly):

https://raw.githubusercontent.com/{owner}/{repo}/HEAD/{path}

This format works for all use cases (browser fetch with CORS, curl/shell scripts, direct browser links).

Do NOT use:

- `https://github.com/{owner}/{repo}/blob/HEAD/{path}?raw=1` (no CORS headers, breaks browser fetch)
- `https://api.github.com/repos/{owner}/{repo}/contents/{path}` (returns JSON, not raw content)


## Git / PR Merge Policy

- Always use **squash and merge** when merging PRs. Never use merge commits or rebase merges. This keeps the git history clean with one commit per PR.
- You may `git merge origin/main` or `git merge origin/master` locally to sync branches, but PR merges must always be squash merges.

## Test Stack

This project uses **Vitest** for unit tests, aligned with the conventions used in
[`sqlui-native`](https://github.com/synle/sqlui-native) so the two repos stay
consistent:

- Test files use the `*.spec.{ts,tsx}` suffix (NOT `*.test.*`).
- `globals: true` in `vitest.config.ts` — `describe` / `test` / `expect` are
  available without imports, but explicit imports are still encouraged for clarity.
- npm scripts:
  - `npm run test` — watch mode for local development.
  - `npm run test-ci` — single run with coverage; this is the script the
    reusable CI workflow auto-detects.
  - `npm run coverage` — alias for `test-ci`.
- Coverage uses the **v8** provider; reports are written to `./coverage/`.
- Component tests opt into a DOM by adding `// @vitest-environment jsdom` at
  the top of the spec file. Use `@testing-library/react` for rendering and
  `vi.mock` to stub heavy/IO-bound deps (e.g. FontAwesome, axios).

## CI

The pipeline is the reusable workflow in
[`synle/workflows`](https://github.com/synle/workflows), invoked from
`.github/workflows/build-and-commit-sh.yml`. It auto-detects:

- `npm run build` — production build
- `npm run format` — Prettier
- `npm run test-ci` — Vitest + coverage

Any of these missing is treated as "skipped", not a failure.

## Editor

- `tsconfig.json` covers TS/TSX files.
- `jsconfig.json` is included so VSCode IntelliSense also works for plain JS
  files (`index.mjs`, `.eslintrc.js`) and respects the `~/*` path alias.

For a more complete contributor walkthrough, see [`dev.md`](./dev.md).
