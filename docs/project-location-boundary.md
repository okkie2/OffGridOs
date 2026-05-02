# Project and Location Boundary

This note captures the intended ownership boundary for OffGridOS going forward.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Mental Model

- A `project` is the top-level tenant boundary.
- A `project` can contain multiple `locations`.
- Starting a new `project` means a clean slate.
- Starting a new `location` within an existing `project` also means a clean slate for that location.
- The catalogue is shared within a `project` and can be reused across that project's `locations`.

## Scope Split

- `project` data is shared context for the whole project.
- `location` data is site-specific configuration and observed assets.
- load-side (Consumption) operational data, including converters, circuits, and loads, is location-scoped.
- `catalogue` data is reusable definitions that can span multiple locations in the same project.

## Design Direction

The current database and UI still carry some implementation details from the earlier multi-project setup.
The intended direction is:

- `project` owns the shared catalogue
- `location` owns the actual installation configuration
- `location` also owns the load-side (Consumption) operational setup for converters, load circuits, and loads
- starting a new `location` duplicates nothing except access to the project catalogue
- starting a new `project` starts empty unless a catalogue is intentionally copied or seeded

## Proposed Row Ownership Convention

For UI-backed operational tables, the preferred direction is:

- every row carries a `project_id`
- every row may carry a nullable `location_id`
- `location_id = null` means the row belongs to the wider project context
- `location_id` set means the row belongs to the current location context

This makes the scope visible in the schema instead of relying on page behavior alone.

The convention is especially useful for:

- shared catalogue rows
- project-level configuration rows
- location-specific operational rows

## Timestamp Convention

SQLite does not add application-level timestamps automatically.

If a table needs audit-friendly lifecycle fields, add them explicitly as:

- `created_at`
- `updated_at`

Use them only on mutable tables where the timestamps help explain history or support synchronization.

## Current Implication

The old `default-project` fallback name is not a good permanent concept.
The current working project should use a real project id, and the application should avoid implying that the active project is a temporary placeholder.

## Current Next Action

Start Slice 3 in the catalogue layer:

- [x] make the project boundary explicit in the domain model
- [x] add the migration path for the current project/location boundary
- [x] split project-scoped and location-scoped queries

## Implementation Checklist

### Slice 1: Establish the boundary in data

- [x] [src/config/project.ts](/Users/joostokkinga/Code/OffGridOS/src/config/project.ts): make the canonical current project id explicit and stop using fallback naming in the app.
- [x] [src/db/schema.ts](/Users/joostokkinga/Code/OffGridOS/src/db/schema.ts): introduce the migration path that keeps projects canonical, prepares for `location_id`, and preserves existing data.
- [x] [src/domain/types.ts](/Users/joostokkinga/Code/OffGridOS/src/domain/types.ts): add the project/location ownership shape explicitly in the TypeScript domain model.
- [x] [src/db/queries.ts](/Users/joostokkinga/Code/OffGridOS/src/db/queries.ts): split project-scoped and location-scoped queries so the ownership boundary is visible in the data layer.

### Slice 2: Wire location ownership through the app

- [x] [src/server.ts](/Users/joostokkinga/Code/OffGridOS/src/server.ts): update API routes so location-specific data is written and read against a location boundary.
- [x] [web/src/App.tsx](/Users/joostokkinga/Code/OffGridOS/web/src/App.tsx): add project and location selection flows in the UI and stop implying there is only one site context.
- [x] [docs/database.md](/Users/joostokkinga/Code/OffGridOS/docs/database.md): keep the schema narrative and ER diagram aligned after the location boundary lands.

### Slice 3: Scope the catalogue cleanly

- [ ] [src/db/schema.ts](/Users/joostokkinga/Code/OffGridOS/src/db/schema.ts): move catalogue ownership to the project boundary where needed.
- [ ] [src/db/queries.ts](/Users/joostokkinga/Code/OffGridOS/src/db/queries.ts): make catalogue queries project-aware.
- [ ] [src/output/exportDigitalTwin.ts](/Users/joostokkinga/Code/OffGridOS/src/output/exportDigitalTwin.ts): export the updated ownership model so the UI and future APIs stay consistent.
- [x] [docs/project-location-boundary.md](/Users/joostokkinga/Code/OffGridOS/docs/project-location-boundary.md): keep this checklist updated as the implementation slices land.

### Slice 4: Clean up the user-facing model

- [ ] [README.md](/Users/joostokkinga/Code/OffGridOS/README.md): point readers at the boundary note and current roadmap phase.
- [ ] [UBIQUITOUS_LANGUAGE.md](/Users/joostokkinga/Code/OffGridOS/UBIQUITOUS_LANGUAGE.md): keep `Project` and `Location` terminology canonical.
- [ ] [ROADMAP.md](/Users/joostokkinga/Code/OffGridOS/ROADMAP.md): keep Phase 1 aligned with the actual implementation sequence.
