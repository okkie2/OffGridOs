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
- location-owned rows should persist both `project_id` and `location_id` explicitly in the row schema so ownership is visible in SQL.

## Three-Bucket Scope Rule

Use three explicit ownership buckets when designing tables:

### 1. Global catalog

- no `project_id`
- no `location_id`
- reusable definitions that are not owned by one project

Examples:

- `panel_types`
- `mppt_types`
- `battery_types`
- `inverter_types`
- `converter_types`
- `cabinet_types`
- `dc_busbars`

### 2. Project-wide

- `project_id` present
- `location_id = null`
- owned by the project, but not by one location

Examples:

- `project_preferences`
- future project-level settings or shared project setup rows

### 3. Location-owned

- `project_id` present
- `location_id` present
- owned by one specific location inside the project

Examples:

- `locations`
- `surfaces`
- `surface_panel_assignments`
- `pv_arrays`
- `pv_strings`
- `array_to_mppt_mappings`
- `surface_configurations`
- `battery_bank_configurations`
- `inverter_configurations`
- `converters`
- `load_circuits`
- `loads`

This keeps scope visible in the schema instead of relying on page behavior alone.

Boundary tables such as `projects` and `locations` are allowed to be exceptions when carrying scope columns would not make the meaning clearer.

## Timestamp Convention

SQLite does not add application-level timestamps automatically.

If a table needs audit-friendly lifecycle fields, add them explicitly as:

- `created_at`
- `updated_at`

Use them only on mutable tables where the timestamps help explain history or support synchronization.

## Scope Matrix

This matrix translates the three-bucket rule into the current schema so future migrations can be planned table by table.

| Table | Bucket | Note |
|---|---|---|
| `projects` | Boundary exception | Root tenant table; does not need scope columns. |
| `locations` | Location-owned boundary table | Defines the location itself and carries the current location context. |
| `panel_types` | Global catalog | Reusable panel definitions. |
| `mppt_types` | Global catalog | Reusable MPPT definitions. |
| `battery_types` | Global catalog | Reusable battery definitions. |
| `inverter_types` | Global catalog | Reusable inverter definitions. |
| `converter_types` | Global catalog | Reusable converter definitions. |
| `cabinet_types` | Global catalog | Reusable cabinet definitions. |
| `dc_busbars` | Global catalog | Shared DC busbar definitions; currently empty in the live DB. |
| `project_preferences` | Project-wide | Shared project settings. |
| `surfaces` | Location-owned | Surface rows belong to one project and one location. |
| `surface_panel_assignments` | Location-owned | Explicitly stores the owning project and location for each panel assignment. |
| `pv_arrays` | Location-owned | Explicitly stores the owning project and location for each array. |
| `pv_strings` | Location-owned | Explicitly stores the owning project and location for each string. |
| `array_to_mppt_mappings` | Location-owned | Explicitly stores the owning project and location for each array-to-MPPT mapping. |
| `surface_configurations` | Location-owned | Explicitly stores the owning project and location for each per-surface configuration. |
| `battery_bank_configurations` | Location-owned | Current project/location battery setup. |
| `inverter_configurations` | Location-owned | Inverter setup follows the active location the same way battery-bank setup does. |
| `converters` | Location-owned | Project-selected converter instances shown on Consumption. |
| `load_circuits` | Location-owned | Circuits belong to one converter context in one location. |
| `loads` | Location-owned | Loads belong to one circuit in one location. |

Tables still using inherited scope instead of explicit `location_id` should be treated as migration candidates if the goal is maximum traceability.

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
