
`TODO.md` is the concrete publish checklist. Use `NOW` for the blockers to clear before the MVP goes online, `NEXT` for the first post-publish tasks, and `LATER` for worthwhile work that should wait. If `NOW` is empty, the MVP publish blockers are done.

## NOW

- Stabilize page-state ownership across all pages so remembered filters, selected rows, and location context cannot bleed between workbenches.
- Review the UI-backed tables for explicit `project_id` ownership, nullable `location_id` scope, and ambiguous names that should be aligned with the ubiquitous language.

## NEXT

- Keep the single-instance local runtime rule intact: one canonical manual app URL on `http://127.0.0.1:3000`, guarded startup scripts, and no alternate localhost browser path for manual use.
- Keep PV topology as derived data for now (from panel assignment + surface configuration), and postpone direct array/string row editing until after downstream AC-side modeling is in place.
- Keep the `Reports` section separate from `Catalogs`; the read-only `Verdict summary` and `Cost summary` pages belong under `Reports`, not the catalog CRUD area.
- Use [persistence-testing-strategy.md](./docs/persistence-testing-strategy.md) as the reference plan for expanding save-box persistence coverage across all editable fields.
- Use [persistence-field-coverage-matrix.md](./docs/persistence-field-coverage-matrix.md) as the field inventory and coverage contract when adding persistence tests.
- Add multilingual UI support for English, Dutch, and Frisian, with the web app translated while the BDD suite stays English-only.

## LATER

- Add richer downstream AC-side modeling for load circuits, Loads, and generator scenarios in the web app and calculation layer.
- Add durable import and export support for project data without making the frontend depend on generated JSON files.
