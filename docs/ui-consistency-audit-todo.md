# UI Consistency Audit TODO

Date: 2026-04-30

## Diagnosis

The OffGridOS UI is starting to mix three different page languages:

- catalog CRUD pages
- read-only report pages
- project configuration and master-detail pages

Tables are appropriate for catalog browsing and reports. They are not the right default for project-owned entities such as converters, load circuits, loads, surfaces, and configurations. Those should use block collections and master-detail layouts so the app keeps feeling like a system model instead of unrelated admin screens.

The main current drift is on the Consumption side, especially `/loads` and `/load-circuits`, where non-catalog project entities copied catalog table patterns.

The broader stabilization direction is captured in [app-organisation.md](./app-organisation.md).

## Completed

- Documented the page-type rules in [`docs/app-organisation.md`](./app-organisation.md).
- Documented the URL and breadcrumb consistency rules in [`docs/app-organisation.md`](./app-organisation.md).
- Updated the root breadcrumb to use the configured location title instead of a vague `Project` label.
- Implemented the Consumption drill-down route shape and breadcrumb hierarchy.
- Removed the redundant page-title repetition from the top of the production page and cleaned up the production summary copy.
- Restored the `Load circuits` and `Loads` Consumption submenu entries after a temporary menu regression.
- Removed the active selection outline from the first cards on `/load-circuits` and `/loads` so those support pages no longer feel preselected by default.
- Fixed the direct `/load-circuits` and `/loads` render paths so both pages load directly again.

For page type rules, URL and breadcrumb rules, header rules, block rules, and master-detail rules, see [app-organisation.md](./app-organisation.md) — that file is the canonical authority.

## NOW

1. Stabilize page-state rules across all pages.
   - Keep URL state authoritative.
   - Keep remembered filters scoped to location where relevant.
2. Review the project/location boundary in the schema and query layer.
   - Keep `project_id` explicit everywhere.
   - Prefer nullable `location_id` for scope.
3. Review ambiguous table names and align them with the ubiquitous language.
   - Call out tables that mix catalogue and instance meaning.
4. Keep `/loads` and `/load-circuits` block-based and free of catalog-style drift.
   - Leave the support pages accessible directly from the menu.

## NEXT

4. Create shared block conventions in code and CSS.
5. Rename generic CSS classes after behavior is stable.
6. Review Production against the same block/report split.
7. Review Storage for consistent configuration/result/feedback sections.
8. Review Reports to keep them read-only and table-first.
9. Add BDD coverage for breadcrumb and direct-route consistency on the Consumption support pages.

## LATER

10. Consider adding `docs/ui-patterns.md` as a compact pattern guide.
11. Decide whether `/loads` and `/load-circuits` should stay in primary navigation.
12. Consider a dedicated nested load detail route:

`/consumption/converters/:converterId/load-circuits/:loadCircuitId/loads/:loadId`

## First Cleanup Prompt

Use this prompt for a smaller model:

```text
Execute the OffGridOS UI consistency TODO list from docs/ui-consistency-audit-todo.md.

Start with `/loads` and `/load-circuits`.
Do not change database schema.
Do not redesign the visual theme.
Use existing block/card patterns from Production and Consumption.
Tables are allowed only for Catalog and Report pages.
Project-owned entities like load circuits and loads should use block collections and master-detail layouts.

Also check URL and breadcrumb consistency:
- breadcrumbs must mirror nested routes
- entity crumbs should use configured titles when available
- Consumption drill-down should read Project / Consumption / Converter / Load circuit

After each page cleanup:
- run `npm run build`
- update `CHANGELOG.md`
- keep changes small and focused
```
