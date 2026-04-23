# Deployment

Deployment guide for running OffGridOS as one web app with persistent SQLite storage.

## Current deployment target

The current target is Railway, but this document is intentionally written around the runtime shape rather than one hosting vendor.

OffGridOS is deployed as:

- one Node server process
- one built React frontend served by that same Node server
- one SQLite database file stored on persistent mounted storage

The important runtime split is:

- application code lives in the container filesystem and is disposable
- the SQLite file lives on mounted persistent storage and must survive redeploys

## Source of truth

The database is the source of truth.

`digital-twin.json` is not the deployment boundary and should not be treated as durable application state.

For day-to-day work, treat the local SQLite file as the editable source of truth and Railway as the published copy.

## Required runtime paths

Use persistent mounted storage at:

```text
/data
```

Store the SQLite file at:

```text
/data/project.db
```

This is the critical rule for persistence.

- Good: `/data/project.db`
- Bad: `./project.db`

If the database file is stored outside mounted persistent storage, redeploys will appear to erase data.

## Required environment variables

Set these in the deployment environment:

```text
DATABASE_PATH=/data/project.db
NODE_ENV=production
```

If `DATABASE_PATH` is omitted in production, the server now falls back to `/data/project.db` so Railway deployments keep using mounted storage instead of a disposable container path.

The server also fails fast in production if `DATABASE_PATH` resolves anywhere outside `/data/project.db`, so a misconfigured deploy cannot silently create a fresh empty database in the container filesystem.

The hosting platform must also provide `PORT`, which the Node server uses at runtime.

For local production rehearsals, you can optionally set `HOST=127.0.0.1` so the server binds to the loopback interface instead of the platform default.

## Build and start

OffGridOS uses:

- `npm run build`
- `npm run start`

The build step:

- compiles the Node server with TypeScript
- builds the React frontend with Vite into static assets

The start step:

- starts the Node server
- initializes the SQLite schema if needed
- serves the frontend
- exposes the API

## Deployment checklist

### 1. Connect the repository

- Push the repository to GitHub.
- Create a deployment project from the GitHub repository.

### 2. Add persistent storage

- Create mounted persistent storage.
- Mount it at `/data`.

### 3. Set environment variables

- `DATABASE_PATH=/data/project.db`
- `NODE_ENV=production`

### 4. Start the app

Use:

```text
npm run start
```

## Current hosting notes for Railway

When using Railway specifically:

- mount a volume at `/data`
- keep the app scaled to one running instance while SQLite remains the primary database

## Recommended workflow

Use a local-first publishing workflow:

1. edit project data locally
2. verify the local app and local database
3. push code changes to GitHub when needed
4. publish the local SQLite file to Railway as a separate operational step

This avoids remote-only edits and makes recovery much easier when something goes wrong.

### Safe routine

For normal work:

1. edit data locally in `project.db`
2. run the app locally and confirm the new panel, location, or catalog changes look right
3. if code changed, push the code to GitHub and let Railway deploy it
4. set a strong `DATABASE_PUBLISH_TOKEN` in Railway
5. after the code is healthy, upload the local SQLite file to `POST /api/admin/publish-database`
6. smoke-test the live app

### Publish command

Once `DATABASE_PUBLISH_TOKEN` is configured in Railway, publish the local database with:

```bash
curl -X POST \
  -H "x-database-publish-token: $DATABASE_PUBLISH_TOKEN" \
  -H "Content-Type: application/octet-stream" \
  --data-binary @project.db \
  https://offgridos.eu/api/admin/publish-database
```

The server validates that the uploaded file is a real SQLite database before replacing `/data/project.db`.

Because the app stores uploaded images inside SQLite as data URLs, publishing `project.db` also publishes the images.

### Important rule

Do not rely on `git push` to move SQLite data.

GitHub deploys application code. Railway volume data is separate. Updating the remote SQLite file must be an explicit publish step.

### Safety notes

- Keep `DATABASE_PUBLISH_TOKEN` only in Railway and your local shell, not in Git.
- Use the publish endpoint only for deliberate database releases from your local source-of-truth file.
- If you later replace this with a more formal sync or admin flow, remove the endpoint and token.

### Temporary production behavior

The app currently skips rebuilding derived PV topology rows during startup so legacy production databases can still boot.

That means these tables may be empty or stale until they are repaired explicitly:

- `pv_arrays`
- `pv_strings`
- `array_to_mppt_mappings`

The core project data remains in the main source tables such as locations, surfaces, assignments, catalogs, and configurations.

## Current custom-domain notes

For the current Vimexx setup:

- use an `ALIAS` record on the root domain `@`
- point `@` to `gctmtjxx.up.railway.app.`
- use a `CNAME` record for `www`
- point `www` to `offgridos.eu.`
- keep the existing mail and NS records in place

If Vimexx refuses the root `ALIAS` again, fall back to `www.offgridos.eu` as the live app URL and redirect the apex domain to it.

## Deployment assumptions

This setup is a good fit while OffGridOS remains:

- single-project
- single-user
- single-instance
- low traffic
- low concurrency
- centered on one small SQLite-backed project dataset

## What the server is responsible for

The production Node server is responsible for:

- reading `DATABASE_PATH`
- reading `HOST` when a local override is needed
- creating the database directory when needed
- initializing the schema at startup
- serving the built frontend
- exposing API endpoints for the React app

When bootstrap fails, the server now also logs database diagnostics so Railway logs show:

- the database path
- key table counts
- `PRAGMA foreign_key_check` output
- the exact failed MPPT-mapping payload when that insert fails

## Verification after deploy

After the first deploy, verify:

1. the app starts successfully
2. the database file exists on mounted persistent storage
3. a location change or other edit survives a redeploy
4. the frontend loads through the server rather than depending on a static JSON export

## Current limitations

This deployment shape is intentionally simple. It does not yet address:

- multi-instance concurrency
- background workers
- backup automation
- a future move to a server database such as Postgres

If OffGridOS later needs collaboration, many users, or heavier concurrent editing, the next architecture step should probably be a move to Postgres rather than stretching SQLite beyond what it is best at.
