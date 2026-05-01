# App Organisation

This is the canonical app-structure and navigation note for OffGridOS.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Specialized screen notes remain separate when they describe one detailed screen, such as:

- [first-screen-layout.md](./first-screen-layout.md)
- [battery-inverter-screen.md](./battery-inverter-screen.md)
- [load-circuit-load-screen.md](./load-circuit-load-screen.md)
- [monthly-balance-screen.md](./monthly-balance-screen.md)
- [verdict-price-summary-pages.md](./verdict-price-summary-pages.md)

## Purpose

The app should feel like a system model, not a pile of unrelated screens.

The main structure follows the energy flow:

`Location -> Production -> Storage -> Consumption -> Reports`

Supporting catalogue maintenance sits outside that flow under `Catalogs`.

## Top-level Navigation

Recommended top-level sections:

1. `Location`
2. `Production`
3. `Storage`
4. `Consumption`
5. `Reports`
6. `Catalogs`

Default landing page:

- `Location`

This gives the user immediate site context before they move into production, storage, or consumption detail.

## Navigation Principle

The app should expose the symmetry of the installation:

- `Production` creates energy
- `Storage` holds energy in the battery bank
- `Consumption` uses energy downstream

This is more understandable than organising the main menu around implementation terms.

The full conceptual chain is:

`Location -> Production -> Surface -> Array -> MPPT -> Battery bank -> Converter -> Load circuit -> Load`

The app does not need one page per node at first, but this should remain the conceptual drill-down path.

## URL And Breadcrumb Consistency

URLs should reflect the conceptual drill-down path and avoid skipping levels.

Preferred patterns:

- `/location`
- `/production`
- `/production/surfaces/:surfaceId`
- `/storage`
- `/consumption`
- `/consumption/converters/:converterId`
- `/consumption/converters/:converterId/load-circuits/:loadCircuitId`

Routing rules:

- a nested page should keep its parent visible in breadcrumbs
- breadcrumb labels should use configured entity titles where available
- the root breadcrumb should use the configured location or project title, not a vague `Project` label
- if `/load-circuits` or `/loads` stay as direct pages, they should be treated as support routes rather than primary navigation destinations
- catalog routes should stay under `Catalogs`
- report routes should stay under `Reports`

## Page Pattern

Detailed pages should follow this basic rhythm:

1. `Start information`
2. `Configuration`
3. `Result`
4. `Feedback`

Each page should help the user understand:

- what is already known
- what can be configured now
- what the resulting configuration is
- what judgment applies to the relationship being modeled

## Shared Rules

### Domain Framing

Use `surface` as the broad production-side concept.

A `surface` may be:

- a roof face
- a wall face
- a flat face

`Roof face` is therefore a subtype or common case, not the only type of surface.

Do not assume there can only be one downstream converter or inverter-like device.
The UI may begin with one converter, but the domain model and page framing should allow multiple conversion devices over time.

### Control Placement

Primary actions should live inside the same visual block as the data they affect.

Prefer:

- a short verb label such as `Save`, `Edit`, or `Delete`
- the action button aligned to the bottom edge of the block
- the action area placed inside the block it controls

This helps the user see what an action affects.

### Collection Mutation

When a page is showing a collection, keep mutations in the collection view.

Prefer:

- create actions that keep the user on the same page
- scrolling or highlighting the newly created item instead of routing away
- delete actions that return the user to a valid collection state
- an explicit empty state when the collection becomes empty

This is especially important for `Production`, because that is where surfaces are added, removed, and opened.

### Relationship Feedback

Judgment and fit language only make sense when describing a relationship between two things.

Examples:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`
- `inverter -> load circuit`
- `load circuit -> load`

Broad entity pages should avoid vague standalone labels like `Within limits`.
Relationship pages may use labels such as `optimal`, `acceptable`, `underutilized`, or `outside limits`.

## Section Definitions

### Location

Purpose:

- hold shared site context
- act as the main entrypoint into the project

This page should include:

- location title and description
- coordinates
- site photo
- notes

Important intent:

- `Location` owns shared site data only
- `Location` does not own surfaces
- `Location` should stay focused on setup and orientation

Suggested route:

- `/location`

### Production

Purpose:

- own the surface collection
- show derived production after the site and surfaces are configured
- compare surfaces and months
- give a quick sense of strongest and weakest periods

This page is the place where surfaces are added, removed, and drilled into.

It should include:

- surface list
- add surface action
- remove surface action
- open surface detail action
- derived production overview

Important intent:

- `Production` replaces the earlier `Yield` or `Solar yield` top-level idea
- `Production` is derived from `Location` plus configured surfaces
- `Production` should explain result and own the surface collection
- `Production` should not collect shared site context

Suggested routes:

- `/production`
- `/production/surfaces/:surfaceId`

### Surface

Purpose:

- manage one surface
- manage panel arrays for that surface
- manage MPPT selection for that surface
- show per-surface production setup and feedback

This page should include:

- surface summary
- panel type
- panel count
- panel array configuration
- MPPT selection
- `array -> MPPT` feedback
- surface-level production output

Important intent:

- `Surface` is a child of `Production`
- `Surface` keeps panel arrays and MPPT detail together
- `Surface` should not absorb storage or load-side concerns

### Storage

Purpose:

- inspect the battery bank
- configure battery-bank composition
- evaluate storage fit and seasonal pressure

This section is battery bank only.

It should include:

- battery type
- battery count
- series and parallel layout
- resulting voltage
- resulting capacity
- upstream charging context from MPPTs
- seasonal storage pressure

Important intent:

- converters do not live under `Storage`
- inverter-like or converter-like downstream devices belong under `Consumption`

Suggested route:

- `/storage`

### Consumption

Purpose:

- inspect downstream conversion and distribution
- manage converters
- manage load circuits
- manage loads

Recommended order:

1. converters
2. load circuits
3. loads

Use `Converters` as the navigation label when it helps the user understand the chain.
Keep `Conversion device` as the underlying domain concept in code, schema, and catalog language unless the ubiquitous language is deliberately changed.

This section should include:

- converters
- load circuits downstream of a converter
- loads grouped by load circuit
- `inverter -> load circuit` or `converter -> load circuit` feedback
- `load circuit -> load` feedback

Suggested routes:

- `/consumption`
- `/consumption/converters/:converterId`
- `/consumption/load-circuits/:loadCircuitId`

### Reports

Purpose:

- present read-only summaries
- show seasonal behavior
- show technical verdicts and cost summaries

This section should stay compact and report-oriented.

Main report screens:

- [monthly-balance-screen.md](./monthly-balance-screen.md)
- [verdict-price-summary-pages.md](./verdict-price-summary-pages.md)

Suggested routes:

- `/reports/monthly-balance`
- `/reports/verdict-summary`
- `/reports/cost-summary`

### Catalogs

Purpose:

- manage shared reusable definitions
- keep catalogue maintenance separate from the project flow

This section should contain:

- panel types
- MPPT types
- battery types
- inverter types
- conversion devices
- cabinet types

## Filtering Behavior

Filtering should be used on long list pages so the user can stay oriented as the model grows.

### Loads

The loads page should support filters for:

- load circuit
- search by load name
- load status or verdict
- unassigned or grouped loads

Recommended behavior:

- default to the currently selected load circuit when one is in focus
- allow switching to `All loads`
- keep the active filter visible in the page header or filter bar

### Load Circuits

The load circuits page should support filters for:

- converter
- search by load circuit name
- load-circuit status or verdict
- empty versus populated circuits

Recommended behavior:

- make it easy to view one converter and all of its downstream load circuits
- keep a path back to the parent converter visible
- allow a project-wide `All load circuits` view

### Converters

The converter pages should support filters for:

- device kind
- in use versus unused
- search by name
- project relevance

Recommended behavior:

- separate inverter-like and converter-like entries when that distinction matters
- allow a catalogue view that shows everything
- allow a narrowed view when the user is checking a specific downstream chain

## Context Persistence

When the user drills down, the app should preserve context such as:

- currently selected surface
- currently selected month
- currently selected array
- currently selected MPPT
- currently selected converter
- currently selected load circuit

This should be reflected in:

- the URL when practical
- UI breadcrumbs
- configuration state

Recommended breadcrumb examples:

- `Location`
- `Production / South-East`
- `Storage`
- `Consumption / Living room sockets`
- `Reports / Monthly balance`

## Implementation Priorities

The next implementation pass should prioritize:

1. top-level navigation around `Location`, `Production`, `Storage`, `Consumption`, `Reports`, and `Catalogs`
2. `Location` as pure site context
3. `Production` as the surface collection and production overview
4. `Surface` detail with panel arrays and MPPT feedback
5. `Storage` as battery bank only
6. `Consumption` with converters, load circuits, and loads

Specialized screen notes remain useful for detailed page layout, but this file is the canonical reference for app structure, navigation, and ownership.
