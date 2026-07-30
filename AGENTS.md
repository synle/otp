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
- **Vaults are namespaced per provider.** Identities live in `otp.db`
  (SQLite via Node's built-in `node:sqlite`); rows carry a `user_id`
  column of `<sanitized-email>-<provider>`. Same email + different
  providers ⇒ two independent vaults — by design (no email-verification
  trust required, no cross-provider takeover possible). Pre-existing
  JSON files (`<email>.cred.json` legacy or `<email>-<provider>.cred.json`
  Phase-1) are auto-imported on first read and the file is renamed with
  a `.migrated` suffix.
- **OAuth state nonce.** The login route mints a random nonce, signs it into
  a short-lived `__auth_state` cookie alongside the providerId and
  redirectUri, and the callback rejects mismatches. This is the login-CSRF
  defence and the reason the callback never trusts its own request URL.
- **Microsoft uses `responseMode=form_post` (POST callback). Google uses the
  default GET callback.** The `$provider.login_callback` route exports both
  `loader` and `action` so the same file handles either.

## Required env vars

| Var                                                                | Purpose                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SESSION_SECRET`                                                   | Signs the session + pre-auth cookies. **Required in production** — boot fails otherwise. Falls back to `AAD_SSO_CLIENT_VALUE` for legacy deployments, then a dev literal.                                                                |
| `AAD_SSO_TENANT_ID` / `AAD_SSO_CLIENT_ID` / `AAD_SSO_CLIENT_VALUE` | Microsoft / AAD app registration.                                                                                                                                                                                                        |
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET`            | Google Cloud Console OAuth client.                                                                                                                                                                                                       |
| `MICROSOFT_REDIRECT_URL` / `GOOGLE_REDIRECT_URL`                   | (optional) Per-provider redirect URI override.                                                                                                                                                                                           |
| `AUTH_BASE_HOST_URL`                                               | (optional) Origin used to build redirect URIs when no per-provider override is set.                                                                                                                                                      |
| `AAD_REDIRECT_URL` / `AAD_SSO_BASE_HOST_URL`                       | Legacy AAD-only aliases, still honored.                                                                                                                                                                                                  |
| `OTP_DB_PATH`                                                      | (optional) Path to the SQLite file. Absolute is used as-is, relative resolves against cwd. Defaults to `${cwd}/otp.db`. Used in production deploys to point at a persistent volume (e.g. `/home/site/data/otp.db` on Azure App Service). |
| `PORT`                                                             | Bound by `index.mjs`. Azure App Service sets this for you.                                                                                                                                                                               |

## Azure deployment

Deployed as an **Azure App Service for Linux** (Node 24) via
[`.github/workflows/deploy-azure.yml`](./.github/workflows/deploy-azure.yml)
— manual `workflow_dispatch` trigger, `azure/webapps-deploy@v3` action,
publish-profile auth.

Required GitHub Actions secrets (on the `azure-production` environment):

| Secret                         | Source                                                                                 |
| ------------------------------ | -------------------------------------------------------------------------------------- |
| `AZURE_WEBAPP_NAME`            | The Web App's resource name.                                                           |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | `az webapp deployment list-publishing-profiles -g $RG -n $APP --xml` — paste full XML. |

Application settings to configure on the Web App itself (not GitHub):
all the env vars above, plus `OTP_DB_PATH=/home/site/data/otp.db`,
`SCM_DO_BUILD_DURING_DEPLOYMENT=false`, `WEBSITE_NODE_DEFAULT_VERSION=~24`.

End-to-end CLI walkthrough lives in `README.md` ("How to deploy to Azure").

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
- `.vscode/launch.json` ships five one-click launch configs (Run and Debug
  panel / `F5`), matching the sister `remixjs-msal-starter-code` repo:
  - **Remix Dev Server** — `npm run dev` with the JS debugger attached
  - **Remix Production Server (built)** — `npm start` with `NODE_ENV=production`
  - **Vitest: Run All Tests**
  - **Vitest: Debug Current Test File** — uses `${relativeFile}`
  - **Vitest: Coverage**

For a more complete contributor walkthrough, see [`dev.md`](./dev.md).
