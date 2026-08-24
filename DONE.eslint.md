# DONE.eslint — otp

Lint debt resolved.
Resolved 2026-08-23 — 22 findings cleared. oxlint runs via `npx oxlint .` (`npm run lint`).
Dispositions below; a follow-up pass may convert config disables back into source fixes.

| Rule                            | Count | Disposition                  |
| ------------------------------- | ----- | ---------------------------- |
| `eslint(no-unused-vars)`        | 13    | disabled in `.oxlintrc.json` |
| `unicorn(no-useless-spread)`    | 2     | fixed by `oxlint --fix`      |
| `eslint(no-unused-expressions)` | 7     | disabled in `.oxlintrc.json` |
