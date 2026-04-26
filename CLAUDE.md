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

## Auth architecture

The app supports **multiple SSO providers** (Microsoft + Google) behind a small
adapter pattern. The big-picture rules to keep in mind when changing anything
in `app/utils/backend/auth/` or the `api.auth.*` routes:

- **Provider registry, not branching.** `app/utils/backend/auth/registry.ts`
  is the single place that lists known providers. Routes only call
  `getProvider(params.provider)` and use the `AuthProvider` interface — they
  never `if (id === "microsoft")`.
- **Provider-agnostic `User`.** `app/types.d.ts` defines `User` as
  `{ id, email, displayName, provider }`. Anything Graph-shaped or
  Google-shaped lives behind the adapter and never escapes into routes /
  frontend.
- **Vaults are namespaced per provider.** The on-disk file is
  `<sanitized-email>-<provider>.cred.json`. The same email logging in via
  Microsoft vs Google sees two independent vaults — by design (no email-
  verification trust required, no cross-provider takeover possible).
  Pre-existing `<email>.cred.json` files are auto-migrated to
  `<email>-microsoft.cred.json` on first read for a Microsoft user.
- **OAuth state nonce.** The login route mints a random nonce, signs it into
  a short-lived `__auth_state` cookie alongside the providerId and
  redirectUri, and the callback rejects mismatches. This is the login-CSRF
  defence and the reason the callback never trusts its own request URL.
- **Microsoft uses `responseMode=form_post` (POST callback). Google uses the
  default GET callback.** The `$provider.login_callback` route exports both
  `loader` and `action` so the same file handles either.

## Required env vars

| Var | Purpose |
| --- | --- |
| `SESSION_SECRET` | Signs the session + pre-auth cookies. **Required in production** — boot fails otherwise. Falls back to `AAD_SSO_CLIENT_VALUE` for legacy deployments, then a dev literal. |
| `AAD_SSO_TENANT_ID` / `AAD_SSO_CLIENT_ID` / `AAD_SSO_CLIENT_VALUE` | Microsoft / AAD app registration. |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Google Cloud Console OAuth client. |
| `MICROSOFT_REDIRECT_URL` / `GOOGLE_REDIRECT_URL` | (optional) Per-provider redirect URI override. |
| `AUTH_BASE_HOST_URL` | (optional) Origin used to build redirect URIs when no per-provider override is set. |
| `AAD_REDIRECT_URL` / `AAD_SSO_BASE_HOST_URL` | Legacy AAD-only aliases, still honored. |

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
- For env-driven code, prefer `vi.stubEnv` (with `vi.unstubAllEnvs` in
  `afterEach`) over mutating `process.env` directly. See
  `app/utils/backend/auth/state.spec.ts` for the pattern.

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
