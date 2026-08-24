# TODO.eslint — otp

Lint debt inventory for a follow-up agent.
Generated with `npx oxlint` on 2026-08-23 (read-only scan; oxlint not installed in this repo).
Total findings: **22** across **3** rules.

Recommended disposition per rule: fix at the source where cheap; disable via `.oxlintrc.json` where the pattern is intentional or generated code is involved.

| Rule | Count |
|---|---|
| `eslint(no-unused-vars)` | 13 |
| `eslint(no-unused-expressions)` | 7 |
| `unicorn(no-useless-spread)` | 2 |

## Details per rule

### `eslint(no-unused-vars)` (13)
- e.g. `otp/app/root.tsx — Variable 'theme' is declared but never used. Unused variables should start with a '_'.`

### `eslint(no-unused-expressions)` (7)
- e.g. `otp/app/utils/frontend/hooks/ActionDialogs.tsx — Expected expression to be used`

### `unicorn(no-useless-spread)` (2)
- e.g. `otp/app/root.tsx — Using a spread operator here creates a new array unnecessarily.`
