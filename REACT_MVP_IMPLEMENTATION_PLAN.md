# React MVP Implementation Plan

This note defines the first implementation plan for the OffGridOS React MVP.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The design work is now broad enough that implementation should follow a staged plan instead of ad hoc file creation.

This note defines:

- the recommended order of work
- the minimum data/export dependencies
- what should be verified at each stage

## Implementation principle

Build from data outward:

1. export contract
2. static data snapshot
3. overview screen
4. subsystem drill-downs
5. polish and navigation cleanup

Avoid starting with final UI polish before the export contract is stable.

## Phase 1: Export foundation

Goal:

- produce a first frontend-usable JSON export

Deliverables:

- export builder shape aligned with [JSON_EXPORT_SHAPE.md](./JSON_EXPORT_SHAPE.md)
- stable IDs for core entities
- first MVP subset of entities and derived sections

Required minimum export content:

- `roof_faces`
- `panel_types`
- `arrays`
- `project_mppts`
- `battery_banks`
- `project_inverters`
- `array_to_mppt`
- `mppt_to_battery_bank`
- `battery_bank_to_inverter`
- `monthly_balance`
- `summary`

Verification:

- JSON is readable by humans
- IDs are stable
- relationships resolve correctly
- no section is silently missing

## Phase 2: Static frontend shell

Goal:

- create the React app shell that can load and render one static export file

Deliverables:

- app layout
- top navigation
- overview route
- shared status badge component
- shared metric card component

Verification:

- app loads without runtime errors
- static export renders consistently
- missing values fail gracefully

## Phase 3: Overview screen

Goal:

- implement the first useful landing page

Deliverables:

- summary header
- system chain overview
- relationship status strip
- roof-face cards
- monthly summary panel

References:

- [FIRST_SCREEN_LAYOUT.md](./FIRST_SCREEN_LAYOUT.md)
- [APP_NAVIGATION.md](./APP_NAVIGATION.md)

Verification:

- first load explains the system clearly
- weakest month is visible
- major warnings are visible
- clicks to detail pages work

## Phase 4: Roof-face / array / MPPT screen

Goal:

- implement the most valuable PV-side drill-down

Deliverables:

- roof face header
- string and array summary
- MPPT fit section
- monthly performance view for the selected roof face or array

References:

- [ROOF_FACE_ARRAY_SCREEN.md](./ROOF_FACE_ARRAY_SCREEN.md)

Verification:

- one roof face can be inspected end-to-end
- `array -> MPPT` evaluation is clear
- reasons render correctly

## Phase 5: Battery / inverter screen

Goal:

- implement the storage-side drill-down

Deliverables:

- battery-bank summary
- inverter summary
- `MPPT -> battery bank` section
- `battery bank -> inverter` section
- monthly storage pressure summary

References:

- [BATTERY_INVERTER_SCREEN.md](./BATTERY_INVERTER_SCREEN.md)

Verification:

- storage-side relationships are understandable
- inverter sizing pressure is visible
- battery margin is visible by month

## Phase 6: Monthly balance screen

Goal:

- implement the seasonal system view

Deliverables:

- yearly summary
- 12-month chart
- monthly detail rows
- weakest-month and strongest-month summaries

References:

- [MONTHLY_BALANCE_SCREEN.md](./MONTHLY_BALANCE_SCREEN.md)

Verification:

- chart matches monthly table
- weakest month is easy to identify
- surplus and deficit are easy to interpret

## Phase 7: Optional read-only downstream summary

Goal:

- show branch circuits and consumers if enough data exists

Deliverables:

- lightweight downstream section or page
- grouped consumer summary
- branch-circuit load summary

This phase is optional for the first MVP.

## Phase 8: Visual polish and usability cleanup

Goal:

- improve readability, hierarchy, and navigation confidence

Deliverables:

- layout cleanup
- clearer status styling
- responsive behavior
- better empty states
- breadcrumb cleanup

Verification:

- overview is scannable on desktop
- screens remain usable on mobile
- navigation is predictable

## Recommended work order

1. export contract implementation
2. static JSON snapshot
3. app shell and navigation
4. overview
5. roof-face / array / MPPT
6. battery / inverter
7. monthly balance
8. optional downstream summary
9. polish

## Out of scope for first MVP implementation

Do not include initially:

- full project editing in the React app
- hourly simulation
- optimization engine
- rich scenario management
- full AC-side workflow editing

## Recommendation

The first code implementation should stop after:

- export works
- overview works
- PV-side drill-down works
- battery/inverter drill-down works
- monthly balance works

That is the right point to review before expanding further.

