---
name: offgridos-single-local-instance
description: Enforce the OffGridOS local-runtime rule that there is one canonical interactive local app URL, one blessed startup path, and no parallel conflicting localhost copies.
---

# OffGridOS Single Local Instance

Use this skill when:

- starting or restarting the OffGridOS app locally
- changing local run scripts, dev-server setup, or port conventions
- debugging reports that two localhost versions behave differently
- adding docs, tests, or agent guidance about how the local app should run

## Objective

Keep OffGridOS local runtime unambiguous.

The local interactive app must have:

- one canonical browser URL: `http://127.0.0.1:3000`
- one blessed development entrypoint: `npm run dev:app`
- one production-style local entrypoint: `npm run start`
- no alternate interactive localhost port for manual use

## Rules

1. Treat `http://127.0.0.1:3000` as the only supported manual browser URL.
2. Do not introduce a second documented manual app URL such as `6001`.
3. If development needs multiple processes internally, keep extra ports internal-only and undocumented for manual browsing.
4. Add or preserve startup guards that refuse to launch if the canonical port is already occupied.
5. Prefer one wrapper command that starts the full local experience instead of expecting the user to compose multiple raw commands.
6. When touching docs, scripts, tests, or agent guidance, keep all local-run instructions aligned with the canonical URL.

## Workflow

1. Inspect `package.json`, `vite.config.ts`, and any startup scripts.
2. Confirm the canonical URL is still `http://127.0.0.1:3000`.
3. Confirm `npm run dev:app` and `npm run start` both respect the single-instance guard.
4. Check README and local-runtime docs for drift.
5. If a bug report mentions different behavior on different localhost ports, treat that as a process failure and remove the ambiguity.

## Deliverables

When making changes in this area:

- update the enforcing scripts
- update the docs
- update `CHANGELOG.md`
- keep agent guidance aligned if the convention changed
