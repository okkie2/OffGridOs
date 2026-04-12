# App Navigation

This note defines the first navigation structure for the OffGridOS React app.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The design now includes several main screens.

This note defines:

- how they connect
- what the top-level navigation should be
- what the default entrypoint should be
- how the user should move between overview and drill-down screens

## Navigation principle

The app should feel like a system map, not a pile of pages.

That means:

- start from overview
- allow drill-down by subsystem
- keep context visible while moving deeper
- always make it easy to move back to the system-level view

## Top-level navigation

Recommended top-level sections:

1. `Overview`
2. `Roof faces`
3. `Battery and inverter`
4. `Branch circuits`
5. `Monthly balance`

These should be visible in the main app navigation.

## Default landing page

The app should open on:

- `Overview`

This gives the user:

- immediate orientation
- system summary
- warnings
- best and worst month context

## Section definitions

### Overview

Purpose:

- overall status
- quick system chain view
- shortcut into the most important details

Primary destinations from here:

- one roof face
- MPPT fit
- battery/inverter detail
- monthly balance

### Roof faces

Purpose:

- show all roof faces
- compare arrays
- drill into one roof face and its selected MPPT

Main screen:

- [ROOF_FACE_ARRAY_SCREEN.md](./ROOF_FACE_ARRAY_SCREEN.md)

### Battery and inverter

Purpose:

- storage and conversion detail
- DC-side fit and seasonal storage pressure

Main screen:

- [BATTERY_INVERTER_SCREEN.md](./BATTERY_INVERTER_SCREEN.md)

### Branch circuits

Purpose:

- downstream AC distribution
- grouped consumers
- branch loading and downstream fit

Main screen:

- [BRANCH_CIRCUIT_CONSUMER_SCREEN.md](./BRANCH_CIRCUIT_CONSUMER_SCREEN.md)

### Monthly balance

Purpose:

- seasonal system behavior
- weakest and strongest months
- system-level trade-off interpretation

Main screen:

- [MONTHLY_BALANCE_SCREEN.md](./MONTHLY_BALANCE_SCREEN.md)

## Drill-down flow

Recommended flow from left to right through the system:

`Overview -> Roof face -> Array -> MPPT -> Battery bank -> Inverter -> Branch circuit -> Consumer`

The app does not need one page per node at first, but this should remain the conceptual navigation path.

## Context persistence

When the user drills down, the app should preserve context such as:

- currently selected roof face
- currently selected month
- currently selected array
- currently selected MPPT

This should be reflected in:

- the URL when practical
- UI breadcrumbs
- selection state

## Breadcrumbs

Recommended breadcrumb pattern:

- `Overview / Roof faces / South-East`
- `Overview / Battery and inverter`
- `Overview / Branch circuits / Living room sockets`

This helps the user stay oriented in a technical system.

## Suggested URL shape

Examples:

- `/`
- `/roof-faces`
- `/roof-faces/se`
- `/battery`
- `/branch-circuits`
- `/branch-circuits/living-room`
- `/monthly-balance`

If month-specific drill-down becomes useful later:

- `/monthly-balance/january`

## Navigation behavior

The app should support both:

- system-first navigation from the overview
- direct deep links into a subsystem

This is important because some users will think:

- “show me the problem month”

while others will think:

- “show me the South-East roof face”

## Recommendation

The first React implementation should prioritize:

1. top navigation
2. overview landing page
3. roof-face drill-down
4. battery/inverter drill-down
5. monthly balance

Branch-circuit detail can follow once the downstream model is ready enough.

