# React JSON Viewer Setup

This repository can support a simple inspection app built with React.

## Purpose

- Export the local database to a JSON file.
- Let the React app read that JSON file and display configurations.
- Use the app for viewing and comparing configurations, not as the primary data store.

## Suggested structure

Keep the setup small and easy to understand:

- `src/` for the React UI
- `public/configurations.json` or a similar static JSON file for exported data
- a local export script that rebuilds the JSON from the database
- browser `localStorage` for lightweight UI state

If the app grows later, separate the export step from the UI instead of mixing them into one browser-only workflow.

## Storage rules

- Keep configuration data in the JSON export.
- Do not use cookies for configuration data.
- Use `localStorage` for small UI preferences such as the last selected view.
- Use the URL for shareable state when it helps a user return to a specific configuration.

## How it works

The basic loop should stay simple:

1. The local database is edited.
2. A script exports the current configurations to JSON.
3. The JSON file is deployed with the app or fetched from a static location.
4. The React UI reads the JSON and renders configuration lists and details.
5. The browser stores only small preferences like filters, panel collapse state, or the last selected item.

## Suggested flow

1. Update the local database.
2. Regenerate the JSON export.
3. Serve the JSON together with the React app.
4. Open the app and inspect the available configurations.
5. Save only lightweight UI preferences in the browser.

## Deployment note

The simplest deployment is a static React site that loads a static JSON file.

- Render can host the frontend.
- The JSON can be committed, uploaded, or published as part of the build output.
- If the JSON changes often, it should be regenerated outside the browser and redeployed deliberately.

## Notes

- This setup is best when the app is read-only or mostly read-only.
- If write-back is needed later, the architecture should be revisited before adding it.
