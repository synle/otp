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
│   │   ├── _index.tsx      # `/` (root identity grid)
│   │   ├── $.tsx           # SPA catch-all
│   │   ├── api.auth.*.ts   # AAD OAuth flow + session
│   │   ├── api.otp.ts      # GET list
│   │   ├── api.otp.$id.ts  # POST/PUT/DELETE identity
│   │   └── api.otp_code.ts # Generate the rolling 6-digit code
│   ├── utils/
│   │   ├── backend/        # File-backed DAO, session, SSO config
│   │   └── frontend/       # React-query hooks, pure helpers
│   ├── root.tsx            # App shell + provider tree
│   └── types.d.ts          # AAD `/me` profile shape
├── index.mjs               # Express entry that hosts the Remix build
├── vitest.config.ts        # Test runner config
└── .github/workflows/      # CI — defers to synle/workflows
```

## Prerequisites

- Node 18+ (the CI workflow pins Node 24).
- An Azure AD app registration if you want the SSO flow to actually log you
  in. Without it the app boots, but `useMeProfile` returns 401 and you'll see
  the "Log in" splash. See `app/utils/backend/SSO.ts` for the env vars it
  reads.

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
- The `OtpIdentityDAO` writes JSON files relative to `process.cwd()`. Tests
  `chdir` into a fresh `mkdtempSync` directory in `beforeEach` so they never
  pollute the repo and stay isolated from each other.

### What's currently covered

- `app/utils/backend/OtpIdentityDAO.ts` — full CRUD + lifecycle, plus edge
  cases (corrupted JSON, missing file, caller-supplied id override, etc.)
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
- **Persistence**: identities are stored in `${email}.cred.json` in the
  process CWD. There's no DB. The file is owned by whichever email is in the
  AAD `/me` profile.
- **The `tolp` field name** in `api.otp_code.ts` and the `useOtpCode` hook is
  a typo that's consistent on both sides — change them together if you want
  to fix it, otherwise leave it alone.
- **PR policy**: squash and merge only (see `CLAUDE.md`). Direct commits to
  `main` are how small chores have historically landed; for anything
  non-trivial, open a PR.
