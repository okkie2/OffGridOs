# App Navigation

This note defines the current navigation structure for the OffGridOS React app.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

The app now includes several main screens.

This note defines:

- how they connect
- what the top-level navigation should be
- what the default entrypoint should be
- how the user should move between location and drill-down screens

## Navigation principle

The app should feel like a system map, not a pile of pages.

That means:

- start from location
- allow drill-down by subsystem
- keep context visible while moving deeper
- always make it easy to move back to the site-level view

## Top-level navigation

Current top-level sections:

1. `Location`
2. `Catalogs`
3. `Battery and inverter`
4. `Branch circuits`
5. `Monthly balance`

These should be visible in the main app navigation.

## Default landing page

The app should open on:

- `Location`

This gives the user:

- immediate orientation
- site summary
- surface list
- starting point for drill-down

## Section definitions

### Catalogs

Purpose:

- manage the reusable panel, MPPT, battery, and inverter catalogues
- keep all CRUD actions for shared product definitions in one place

Main screen:

- shared catalog landing page plus per-catalog CRUD screens

### Location

Purpose:

- capture shared site context
- list and manage surfaces
- review yield after surface configuration is in place

Main screen:

- start information
- site photo
- surfaces
- yield

### Battery and inverter

Purpose:

- storage and conversion detail
- DC-side fit and seasonal storage pressure

Main screen:

- [battery-inverter-screen.md](./battery-inverter-screen.md)

### Branch circuits

Purpose:

- downstream AC distribution
- grouped consumers
- branch loading and downstream fit

Main screen:

- [branch-circuit-consumer-screen.md](./branch-circuit-consumer-screen.md)

### Monthly balance

Purpose:

- seasonal system behavior
- weakest and strongest months
- system-level trade-off interpretation

Main screen:

- [monthly-balance-screen.md](./monthly-balance-screen.md)

## Drill-down flow

Recommended flow from left to right through the system:

`Location -> Surface -> Array -> MPPT -> Battery bank -> Inverter -> Branch circuit -> Consumer`

The app does not need one page per node at first, but this should remain the conceptual navigation path.

## Context persistence

When the user drills down, the app should preserve context such as:

- currently selected surface
- currently selected month
- currently selected array
- currently selected MPPT

This should be reflected in:

- the URL when practical
- UI breadcrumbs
- configuration state

## Breadcrumbs

Recommended breadcrumb pattern:

- `Location / South-East`
- `Battery and inverter`
- `Branch circuits / Living room sockets`

This helps the user stay oriented in a technical system.

## Suggested URL shape

Examples:

- `/`
- `/location`
- `/surfaces/se`
- `/battery`
- `/branch-circuits`
- `/branch-circuits/living-room`
- `/monthly-balance`

If month-specific drill-down becomes useful later:

- `/monthly-balance/january`

## Navigation behavior

The app should support both:

- site-first navigation from the location page
- direct deep links into a subsystem

This is important because some users will think:

- “show me the problem month”

while others will think:

- “show me the South-East surface”

## Recommendation

The first React implementation should prioritize:

1. top navigation
2. location and surface setup
3. battery/inverter drill-down
4. monthly balance

Branch-circuit detail can follow once the downstream model is ready enough.
