
`TODO.md` is the concrete publish checklist. Use `NOW` for the blockers to clear before the MVP goes online, `NEXT` for the first post-publish tasks, and `LATER` for worthwhile work that should wait. If `NOW` is empty, the MVP publish blockers are done.

## NOW

## NEXT

- Use [persistence-testing-strategy.md](./docs/persistence-testing-strategy.md) as the reference plan for expanding save-box persistence coverage across all editable fields.
- Use [persistence-field-coverage-matrix.md](./docs/persistence-field-coverage-matrix.md) as the field inventory and coverage contract when adding persistence tests.
- Add multilingual UI support for English, Dutch, and Frisian, with the web app translated while the BDD suite stays English-only.

## LATER

- Add richer downstream AC-side modeling for load circuits, Loads, and generator scenarios in the web app and calculation layer.
- Add durable import and export support for project data without making the frontend depend on generated JSON files.
