
`TODO.md` is the concrete publish checklist. Use `NOW` for the blockers to clear before the MVP goes online, `NEXT` for the first post-publish tasks, and `LATER` for worthwhile work that should wait. If `NOW` is empty, the MVP publish blockers are done.

## NOW

## NEXT

- Add the remaining input flows and CRUD coverage for any schema tables that are still read-only from the CLI or web app.
- Review the new PV-topology persistence layer in the UI and calculation flow, then decide whether direct editing is the next slice.

## LATER

- Add richer downstream AC-side modeling for branch circuits, consumers, and generator scenarios in the web app and calculation layer.
- Add durable import and export support for project data without making the frontend depend on generated JSON files.
- Improve the CLI experience with richer summaries, navigation shortcuts, and clearer status reporting.
- Review packaging and distribution so the command-line entrypoint and deployed web app both stay easy to run.
