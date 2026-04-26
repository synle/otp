# Developer Guide

A short, opinionated walkthrough of how to work on this repo. For end-user
docs (what the app does, how to deploy it) see [`README.md`](./README.md).

## Project layout

```
.
├── app/
│   ├── components/         # React components (MUI-based)
│   │   ├── ActionDialogs/  # Imperative dialog primitives (alert/confirm/prompt/choice/modal)
│   │   ├── Loading/
│   │   ├── TileItem/       # One identity tile + create/edit forms + QR scanner
│   │   └── TileList/       # Grid of TileItems with search/sort
│   ├── routes/             # Remix file-based routes
│   │   ├── _index.tsx                            # `/` (root identity grid)
│   │   ├── $.tsx                                 # SPA catch-all
│   │   ├── api.auth.login.ts                     # legacy → /api/auth/microsoft/login
│   │   ├── api.auth.$provider.login.ts           # provider-aware login
│   │   ├── api.auth.$provider.login_callback.ts  # GET (Google) + POST (AAD form_post)
│   │   ├── api.auth.logout.ts / api.auth.me.ts   # session lifecycle
│   │   ├── api.otp.ts      # GET list
│   │   ├── api.otp.$id.ts  # POST/PUT/DELETE identity
│   │   └── api.otp_code.ts # Generate the rolling 6-digit code
│   ├── utils/
│   │   ├── backend/
│   │   │   ├── OtpIdentityDAO.ts  # File-backed vault keyed by <email>-<provider>
│   │   │   ├── Session.ts         # Cookie session + secret resolution
│   │   │   └── auth/              # Pluggable SSO provider adapters
│   │   │       ├── types.ts       # AuthProvider interface
│   │   │       ├── registry.ts    # getProvider(id)
│   │   │       ├── microsoft.ts   # AAD/MSAL adapter
│   │   │       ├── google.ts      # Google OAuth2 adapter
│   │   │       ├── state.ts       # OAuth state nonce + pre-auth cookie
│   │   │       └── redirectUri.ts # Per-provider redirect URI resolution
│   │   └── frontend/       # React-query hooks, pure helpers
│   ├── root.tsx            # App shell + provider tree
│   └── types.d.ts          # Provider-agnostic User shape + AuthProviderId
├── index.mjs               # Express entry that hosts the Remix build
├── vitest.config.ts        # Test runner config
└── .github/workflows/      # CI — defers to synle/workflows
```

## Prerequisites

- Node 18+ (the CI workflow pins Node 24).
- An OAuth client from at least one provider so the SSO flow can actually
  log you in. Without one the app boots, but `useMeProfile` returns 401 and
  you'll see the login splash. See `app/utils/backend/auth/microsoft.ts`
  and `auth/google.ts` for the env vars they read.

### Picking a provider

Each provider's vault is independent on disk (see "Persistence" below), so
in dev you can configure either or both:

- **Microsoft** — Azure AD app registration with a client secret. Set
  `AAD_SSO_TENANT_ID`, `AAD_SSO_CLIENT_ID`, `AAD_SSO_CLIENT_VALUE`. Use
  `common` as the tenant id for personal MSAs / multi-tenant.
- **Google** — Google Cloud Console OAuth 2.0 Client. Set
  `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`. Register the dev
  redirect URI (`http://localhost:3000/api/auth/google/login_callback`) in
  the console — Google does an exact-match check.

In production also set `SESSION_SECRET` (the app refuses to boot without
one).

## Day-to-day commands

```bash
npm install            # install deps
npm run dev            # remix dev (hot reload)
npm run build          # production build into ./build
npm start              # node index.mjs (serves the build)

npm run typecheck      # tsc --noEmit
npm run format         # prettier --write
```

## Testing

```bash
npm run test           # watch mode
npm run test-ci        # single run + coverage
npm run coverage       # alias of test-ci; output in ./coverage
```

### Conventions

- Spec files live next to the code they cover and use the `*.spec.{ts,tsx}`
  suffix (e.g. `OtpIdentityDAO.ts` ↔ `OtpIdentityDAO.spec.ts`).
- Pure logic is tested in the default `node` environment. Anything that
  touches React or the DOM opts in per file:

  ```ts
  // @vitest-environment jsdom
  import { render } from "@testing-library/react";
  ```

- For components that pull in heavy or IO-bound dependencies (FontAwesome,
  axios, the Microsoft Graph SDK, the camera scanner, …) use `vi.mock` to
  replace them with stubs. See `app/components/TileItem/BrandIcon.spec.tsx`
  for the pattern.
- For env-driven code (auth secrets, redirect overrides), use `vi.stubEnv`
  in `beforeEach` and `vi.unstubAllEnvs` in `afterEach`. Examples:
  `app/utils/backend/auth/state.spec.ts`, `redirectUri.spec.ts`,
  `Session.spec.ts`.
- The `OtpIdentityDAO` writes JSON files relative to `process.cwd()`. Tests
  `chdir` into a fresh `mkdtempSync` directory in `beforeEach` so they never
  pollute the repo and stay isolated from each other.

### What's currently covered

- `app/utils/backend/OtpIdentityDAO.ts` — full CRUD + lifecycle, sanitizer,
  legacy migration, provider isolation.
- `app/utils/backend/Session.ts` — secret resolution policy.
- `app/utils/backend/auth/state.ts` — nonce round trip, tampering, cross-
  provider mismatch, missing cookie.
- `app/utils/backend/auth/microsoft.ts` — profile normalization (live MSAL
  flow is left to integration testing).
- `app/utils/backend/auth/google.ts` — profile normalization, auth URL,
  code exchange, userinfo, full `authenticate` flow (axios mocked).
- `app/utils/backend/auth/redirectUri.ts` — env precedence, request-URL
  fallback.
- `app/utils/backend/auth/registry.ts` — known + unknown provider lookup.
- `app/utils/frontend/getInitials.ts` — pure helper.
- `app/components/TileItem/BrandIcon.tsx` — brand keyword → icon/color
  resolution, via a mocked `<FontAwesomeIcon>`.

### Adding a new test

1. Create `Foo.spec.ts` (or `.tsx`) next to `Foo.ts`.
2. If the code under test renders React, add `// @vitest-environment jsdom`
   at the top.
3. Use `vi.mock(...)` for heavy deps. Keep mocks above the import of the
   module under test — Vitest hoists them but the order also makes intent
   clear.
4. Run `npm run test` — Vitest will pick the file up automatically based on
   the `**/*.spec.{ts,tsx}` glob in `vitest.config.ts`.

## Adding another SSO provider

1. Create `app/utils/backend/auth/<name>.ts` exporting an `AuthProvider`.
   Keep profile normalization in a separate exported function so it can be
   unit-tested without HTTP.
2. Add the provider to `_PROVIDERS` in
   `app/utils/backend/auth/registry.ts`.
3. Extend `AuthProviderId` in `app/types.d.ts`.
4. Add the provider to `_REDIRECT_ENV_KEY` in
   `auth/redirectUri.ts` and document the env vars it reads.
5. Add a spec (mock `axios` or the SDK) covering the auth URL, code
   exchange, and profile normalization.
6. Add a button in `app/root.tsx` linking to
   `/api/auth/<name>/login`.

## Continuous Integration

CI is one job, defined in `.github/workflows/build-and-commit-sh.yml`, that
delegates to the reusable workflow at
[`synle/workflows`](https://github.com/synle/workflows/blob/main/.github/workflows/build-and-commit-sh.yml).

The reusable workflow auto-detects (in priority order):

| Step   | Detection                                                       |
| ------ | --------------------------------------------------------------- |
| Build  | `Makefile` → `build.sh` → `package.json#scripts.build`          |
| Format | `Makefile` → `package.json#scripts.format` → remote `format.sh` |
| Test   | `Makefile` → `test.sh` → `test-ci` → `test:ci` → `test`         |

Because we expose `npm run test-ci`, CI runs it automatically with coverage.

## Editor support

- TypeScript files are covered by `tsconfig.json`.
- Plain JS files (`index.mjs`, `.eslintrc.js`, etc.) are covered by
  `jsconfig.json`, which also mirrors the `~/*` alias so VSCode IntelliSense
  resolves `~/utils/...` imports.

## Conventions & gotchas

- **Imperative dialogs**: open modals/prompts via the
  `useActionDialogs()` hook, not by mounting `<Dialog>` directly. The hook
  manages a stack so nested dialogs work.
- **Persistence**: identities are stored in
  `<sanitized-email>-<provider>.cred.json` in the process CWD. There's no DB.
  Two providers ⇒ two vaults for the same human; this is intentional.
  Pre-multi-provider files (`<email>.cred.json`) are auto-migrated to the
  Microsoft variant on first read.
- **The `tolp` field name** in `api.otp_code.ts` and the `useOtpCode` hook is
  a typo that's consistent on both sides — change them together if you want
  to fix it, otherwise leave it alone.
- **PR policy**: squash and merge only (see `CLAUDE.md`). Direct commits to
  `main` are how small chores have historically landed; for anything
  non-trivial, open a PR.
