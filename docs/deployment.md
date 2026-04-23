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
