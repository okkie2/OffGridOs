
`TODO.md` is the concrete publish checklist. Use `NOW` for the blockers to clear before the MVP goes online, `NEXT` for the first post-publish tasks, and `LATER` for worthwhile work that should wait. If `NOW` is empty, the MVP publish blockers are done.

## NOW

## NEXT

- Keep the single-instance local runtime rule intact: one canonical manual app URL on `http://127.0.0.1:3000`, guarded startup scripts, and no alternate localhost browser path for manual use.
- Keep PV topology as derived data for now (from panel assignment + surface configuration), and postpone direct array/string row editing until after downstream AC-side modeling is in place.
- Use [persistence-testing-strategy.md](./docs/persistence-testing-strategy.md) as the reference plan for expanding save-box persistence coverage across all editable fields.
- Use [persistence-field-coverage-matrix.md](./docs/persistence-field-coverage-matrix.md) as the field inventory and coverage contract when adding persistence tests.

## LATER

- Add richer downstream AC-side modeling for branch circuits, consumers, and generator scenarios in the web app and calculation layer.
- Add durable import and export support for project data without making the frontend depend on generated JSON files.
- Improve the CLI experience with richer summaries, navigation shortcuts, and clearer status reporting.
- Review packaging and distribution so the command-line entrypoint and deployed web app both stay easy to run.
