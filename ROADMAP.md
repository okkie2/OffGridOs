

## NOW

- Keep the core product flow stable on top of the new runtime: Node server, SQLite as the source of truth, and a React frontend served from the same app.
- Keep the deployed architecture Railway-ready by storing the database on persistent storage and treating the app container as disposable.
- Continue replacing temporary frontend state bridges with API-backed reads and writes so the UI works directly against the project model.
- Stabilize the step-by-step product flow around `Location`, `Face`, `Battery array`, `Inverter array`, `Branch circuits / fusing`, `Consumers`, and `Dashboard`.
- Keep the system explainable enough that a user can understand upstream and downstream effects from one shared data model.

## NEXT

- Replace provisional derived selections with explicit project data for arrays, MPPTs, battery-bank design, and inverter design.
- Broaden the persisted model beyond the current PV-and-battery backbone so the tool can manage branch circuits, consumers, and generator scenarios cleanly.
- Add better reporting around sizing decisions, trade-offs, statuses, and seasonal warnings so results become easier to review and act on.
- Define durable import and export paths for project data without making the frontend depend on a generated JSON file.

## LATER

- Support more advanced optimisation, scenario comparison, and seasonal planning.
- Add richer presentation layers for system visualization, summary output, and shareable reporting.
- Consider multi-project workflows, collaboration needs, and a future move to Postgres if concurrency or scale starts to matter.
