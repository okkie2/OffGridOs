# Frontend Shell Tasks

This note breaks the first React shell into concrete implementation tasks for the OffGridOS MVP.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The React MVP needs a frontend shell that can:

- load the export
- render the overview
- support drill-down navigation
- present relationship status clearly

This note defines the smallest useful sequence for that shell.

## First implementation target

Build a React app that can:

- load one static JSON export
- render the overview screen
- navigate to roof-face, battery/inverter, and monthly screens

## Task 1: Create app shell

Goal:

- establish the frontend application structure

Suggested deliverables:

- root layout
- top navigation
- route structure
- page container

Initial routes:

- `/`
- `/roof-faces`
- `/roof-faces/:roofFaceId`
- `/battery`
- `/monthly-balance`

## Task 2: Add export loader

Goal:

- load the exported JSON file into the app

Suggested deliverables:

- one data loader module
- loading state
- error state
- empty-data fallback

Important rule:

- fail clearly when expected sections are missing

## Task 3: Add shared UI primitives

Goal:

- avoid rebuilding the same patterns screen by screen

Suggested deliverables:

- metric card
- status badge
- section panel
- data row component
- page heading component

These should stay simple in the first version.

## Task 4: Add shared status presentation

Goal:

- make `electrical_status` and `fit_status` easy to scan everywhere

Suggested deliverables:

- `within_limits` badge
- `outside_limits` badge
- `optimal` badge
- `acceptable` badge
- `clipping_expected` badge
- `underutilized` badge

The app should use a consistent visual language for these states.

## Task 5: Build overview screen

Goal:

- implement the first useful landing page

Suggested deliverables:

- summary header
- system chain overview
- relationship status strip
- roof-face cards
- monthly summary panel

Reference:

- [FIRST_SCREEN_LAYOUT.md](./FIRST_SCREEN_LAYOUT.md)

## Task 6: Build roof-face detail route

Goal:

- implement the first PV-side drill-down

Suggested deliverables:

- roof face header
- panel and string section
- array summary
- MPPT fit section
- monthly performance snippet

Reference:

- [ROOF_FACE_ARRAY_SCREEN.md](./ROOF_FACE_ARRAY_SCREEN.md)

## Task 7: Build battery route

Goal:

- implement the battery-bank and inverter screen

Suggested deliverables:

- battery-bank summary
- inverter summary
- relationship status sections
- storage pressure summary

Reference:

- [BATTERY_INVERTER_SCREEN.md](./BATTERY_INVERTER_SCREEN.md)

## Task 8: Build monthly-balance route

Goal:

- implement the seasonal system screen

Suggested deliverables:

- yearly summary
- 12-month chart
- monthly detail rows
- weakest and strongest month blocks

Reference:

- [MONTHLY_BALANCE_SCREEN.md](./MONTHLY_BALANCE_SCREEN.md)

## Task 9: Add navigation polish

Goal:

- make the app feel coherent rather than page-like

Suggested deliverables:

- active nav state
- breadcrumbs
- route-to-route context consistency

Reference:

- [APP_NAVIGATION.md](./APP_NAVIGATION.md)

## Task 10: Add responsive cleanup

Goal:

- keep the app usable on laptop and phone

Suggested deliverables:

- stacked mobile layout
- chart fallback sizing
- roof-face card wrapping
- overflow-safe tables

## Recommended build order

1. app shell
2. export loader
3. shared UI primitives
4. status badges
5. overview
6. roof-face detail
7. battery route
8. monthly-balance route
9. navigation polish
10. responsive cleanup

## Important rule

Do not block the first frontend shell on full design completeness.

If downstream AC-side data is not ready yet:

- hide that section
- or show a read-only placeholder

Do not invent fake data just to make the UI look complete.

## Recommendation

The first coding slice should stop after:

- the app shell loads the export successfully
- the overview renders
- one roof-face detail route works

That is enough to prove the frontend architecture before expanding.

