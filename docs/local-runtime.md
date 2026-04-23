# Local Runtime

OffGridOS now has one canonical interactive local app URL:

- `http://127.0.0.1:3000`

That URL is the only supported browser entrypoint for local work.

## Supported commands

Use exactly one of these commands at a time:

- `npm run dev:app`
- `npm run start`
- `npm run stop:app` when you need to clear stale local OffGridOS listeners before restarting

`npm run dev:web` remains as a backward-compatible alias for `npm run dev:app`, but it now uses the same canonical local URL and the same guard rules.

## Single-instance rule

OffGridOS must not run multiple local app instances on different ports anymore.

The repo now enforces this:

- `npm run dev:app` refuses to start if `3000` is already occupied
- `npm run dev:app` also refuses to start if its internal API port `3001` is already occupied
- `npm run start` refuses to start if `3000` is already occupied

This means there is one agreed local app URL for the project, and the scripts fail fast instead of silently starting a second conflicting copy.

## Cleanup

If an old OffGridOS local process is still hanging around, use:

```bash
npm run stop:app
```

That command looks for local listeners on the known OffGridOS ports:

- `3000`
- `3001`
- `4173`
- `6001`

and sends `SIGTERM` to the matching listener processes so the canonical local app can be started cleanly again.

## Local development shape

`npm run dev:app` starts:

- the Vite web client on `3000`
- the Node API server on internal port `3001`

The browser should still always use only:

- `http://127.0.0.1:3000`

The internal API port is an implementation detail and is not a second supported app URL.

## Production-style local run

`npm run start` serves the built frontend and API from:

- `http://127.0.0.1:3000`

Build first if needed:

```bash
npm run build
npm run start
```

## Automated tests

Some automated tests still use isolated throwaway ports such as `3100` so they can run safely against copied databases without disturbing the canonical local app URL. That exception is for automation only, not for manual app use.
