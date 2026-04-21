# First Screen Layout

This note defines the first useful React screen for the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

The first screen should give the user immediate orientation.

It should answer:

- what system is this
- what are the main upstream components
- are there any urgent problems
- what month looks strongest or weakest
- where should the user click next

## First screen recommendation

The first screen should be a **project overview dashboard**.

It should not try to show every detail at once.
It should act as the entrypoint into the more detailed views.

## Main layout

Suggested layout blocks:

1. top summary header
2. system chain overview
3. relationship status strip
4. monthly balance panel
5. surface and array panel
6. next-action panel

## 1. Top summary header

Show:

- project name
- location
- total installed Wp
- battery capacity
- number of surfaces
- number of arrays
- number of MPPTs

Purpose:

- orient the user immediately

## 2. System chain overview

Show the high-level chain as a readable visual flow:

`Surfaces -> Arrays -> MPPTs -> Battery bank -> Inverter -> Branch circuits -> Consumers`

This should be compact and clickable.

Each node should show:

- count
- key headline metric
- click target into the detailed view

Examples:

- `5 surfaces`
- `5 arrays`
- `5 MPPTs`
- `1 battery bank`
- `1 inverter`

## 3. Relationship status strip

Show one compact status block for each major link:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`

Each block should summarize:

- whether everything is `within_limits`
- whether any items are `outside_limits`
- how many are `optimal`, `acceptable`, `clipping_expected`, or `underutilized`

This gives the user a quick “where is the trouble?” scan.

## 4. Monthly balance panel

Show a 12-month overview.

Minimum useful fields:

- month
- solar contribution
- consumption
- surplus or deficit

Strong first version:

- a simple bar or line chart
- highlight the weakest month
- highlight the strongest month

Purpose:

- make seasonal system behaviour visible immediately

## 5. Surface and array panel

Show one compact card per surface.

Each card should include:

- surface name
- panel type
- panel count
- array name
- selected MPPT
- current fit summary

This is likely the most important panel after the monthly balance panel.

## 6. Next-action panel

Show suggested next clicks based on the current state.

Examples:

- `Review MPPT fit for NE array`
- `Check weakest month`
- `Inspect battery bank margin`
- `Open branch circuits`

This helps the interface feel guided rather than static.

## First load behavior

On first load, the screen should:

1. show the top summary
2. show whether any relationships are `outside_limits`
3. show the weakest month
4. show the surface cards

That gives the user an immediate mental map.

## Interaction priorities

The user should be able to click from the overview into:

- one surface
- one array
- one MPPT
- the monthly balance view
- the battery bank / inverter chain

The first screen should not require scrolling through dense raw tables before the user understands the state of the system.

## Design direction

The overview should feel:

- technical
- calm
- legible
- system-oriented

Avoid:

- crowded spreadsheet-first layout
- giant forms on first load
- too many warnings without hierarchy

Prefer:

- strong information hierarchy
- compact status badges
- clear chain structure
- one obvious entrypoint per major subsystem

## Recommendation

The first implemented React screen should prioritize:

1. summary metrics
2. chain overview
3. relationship status
4. monthly balance
5. surface cards

That is enough to make the project understandable on first load.
