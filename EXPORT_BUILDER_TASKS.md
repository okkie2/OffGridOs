# Export Builder Tasks

This note breaks the first digital twin export foundation into concrete implementation tasks.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The React MVP depends on a stable JSON export.

This note defines the first small task sequence for building that export without trying to solve the whole digital twin at once.

## First implementation target

Build the smallest useful export that supports:

- overview
- roof-face / array / MPPT drill-down
- battery / inverter drill-down
- monthly balance

## Task 1: Define export entrypoint

Goal:

- choose where the export builder lives

Suggested deliverables:

- one export module under `src/output/`
- one CLI-accessible export path
- one known output file location for the React app

Example outcomes:

- `src/output/exportDigitalTwin.ts`
- `ogos export --json`
- output file such as `digital-twin.json`

## Task 2: Export project context

Goal:

- export the top-level `project` section

Include:

- location
- project assumptions
- summary metadata that already exists in the DB

This is the easiest section and a good first milestone.

## Task 3: Export core persisted entities

Goal:

- export the minimum MVP entity set

Include first:

- `roof_faces`
- `panel_types`
- `battery_types`
- `inverter_types`

These already exist in the current schema and can be exported without new schema work.

## Task 4: Derive first array objects from current roof-face assignments

Goal:

- represent one `array` per roof face using current `roof_panels`

This is a temporary bridging step until the explicit `arrays` schema exists.

Suggested derived behavior:

- each roof face becomes one array
- the current roof-face panel assignment becomes the array’s panel basis
- one stable `array_id` is generated per roof face

This lets the frontend start using the `array` concept before the DB stores it directly.

## Task 5: Derive first project MPPT placeholders

Goal:

- provide a temporary project-level MPPT object per array or roof face

This is also a bridge until explicit project MPPT persistence exists.

Suggested behavior:

- generate `project_mppt_id` values from roof-face or array IDs
- leave clear notes that these are provisional selections if not yet configured in DB

## Task 6: Export battery-bank and inverter baseline

Goal:

- provide a first battery-bank and inverter section

If no configured project battery bank or project inverter exists yet:

- export a placeholder or empty section
- do not fake precision

If the project baseline already implies likely choices, that can be surfaced as assumptions, not persisted truth.

## Task 7: Add first relationship objects

Goal:

- emit the relationship objects required for MVP structure

First relationships:

- `array_to_mppt`
- `mppt_to_battery_bank`
- `battery_bank_to_inverter`

At first these may be sparse if full calculation logic is not ready.

Allowed first version:

- IDs
- references
- placeholder or partial `evaluation`

Better next version:

- derived voltage/current/power
- real `electrical_status`
- real `fit_status`

## Task 8: Add first derived summary

Goal:

- support the overview screen as early as possible

Include:

- total installed Wp
- array summaries
- top-level warnings if available
- a lightweight `summary` object

This gives the frontend something useful before full seasonal logic exists.

## Task 9: Add first monthly balance export

Goal:

- produce the 12-row monthly section for the monthly screen

First version can be simple if needed.

Allowed first version:

- estimated solar per month
- rough demand per month
- simple surplus / deficit fields

Later versions can deepen:

- battery charge/discharge
- generator support
- stronger interpretation notes

## Task 10: Add CLI command and write file

Goal:

- make the export easy to generate

Deliverables:

- one CLI command
- one output path
- clear success message

The React app should be able to rely on this output file.

## Recommended implementation order

1. export entrypoint
2. `project`
3. core persisted entities
4. derived arrays from roof-face assignments
5. derived project MPPT placeholders
6. summary section
7. relationship skeletons
8. monthly balance
9. CLI command
10. polish and validation

## Important rule

Do not block the first export on full schema expansion.

Bridge from current data where needed, as long as the export clearly distinguishes:

- actual persisted data
- provisional derived structure
- calculated output

## Recommendation

The very first coding slice should stop after:

- export entrypoint exists
- `project` exists
- `roof_faces`, `panel_types`, and derived `arrays` export correctly
- one static JSON file can be written successfully

That is enough to unlock the first frontend shell.

