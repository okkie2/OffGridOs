# App Structure V2

This document defines the new top-level page structure for the digital twin UI.

It replaces the earlier mixed screen direction with a cleaner step-by-step flow.

The core pattern for each page is:

- `Start information`
- `Configuration`
- `Result`
- `Feedback`

This keeps the app consistent. Each page should help the user understand:

- what is already known
- what can be configured now
- what the resulting configuration is
- what the judgment is for the relationship being modeled

## Control Placement Rule

Primary actions should live inside the same visual block as the data they affect.

Prefer:

- a short verb label such as `Save`, `Edit`, or `Delete`
- the action button aligned to the bottom edge of the block
- the action area placed inside the block it controls, below the content it saves or edits, not floating above or outside it

This helps the user see:

- what the action affects
- which data is already in scope
- where the primary action belongs in the layout hierarchy

## Collection Mutation Rule

When a page is showing a collection, keep mutations in the collection view.

Prefer:

- create actions that keep the user on the same page
- scrolling or highlighting the newly created item instead of routing away
- delete actions that return the user to a valid collection state
- an explicit empty state when the collection becomes empty

This keeps list editing predictable and avoids dead-end pages after create or delete.

## Core Rule

Judgment and fit language only make sense when describing a relationship between two things.

Examples:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`
- `inverter -> branch circuit`
- `branch circuit -> consumers`

So:

- broad entity pages should avoid vague standalone labels like `Within limits`
- relationship pages may use qualifiers like `optimal`, `acceptable`, `underutilized`, or `outside limits`

## Surface Model

Use `surface` as the broader concept.

A `surface` may be:

- a surface
- a wall face
- a flat face

`Roof face` is therefore a subtype or common case, not the only type of surface.

## Inverter Model

Do not assume a single inverter.

The structure must allow:

- one inverter
- multiple inverters

The UI may begin with one inverter, but the domain model and page framing should not imply that only one inverter can ever exist.

## Pages

### 1. Location

Start information:

- location
- GPS coordinates

Selection / configuration:

- shared site inputs
- multiple surfaces

Result:

- surface set / site setup

Feedback:

- completeness
- number of configured surfaces

Notes:

- this page owns shared location information
- surface coordinates and site context should live here, not on individual surface pages

### 2. Panel Array / Surface

Start information:

- surface summary

Configuration:

- panel configuration
- panel array configuration

Result:

- configured panel array for that surface

Feedback:

- solar output per surface

Notes:

- this page is about the surface and its array
- it should not drift into MPPT judgment language unless the user moves to the next page

### 3. MPPT Configuration / Surface

Start information:

- panel array summary

Configuration:

- MPPT configuration

Result:

- MPPT configuration

Feedback:

- `array -> MPPT` judgment

Notes:

- this is the first clearly relational judgment page
- voltage, current, and power checks belong here

### 4. Battery Array

Start information:

- MPPT array summary
- all upstream MPPT outputs coming in from the configured surfaces

Configuration:

- battery configuration
- battery bank configuration

Result:

- battery bank configuration

Feedback:

- `MPPTs -> battery bank` judgment

Notes:

- battery count
- batteries per string
- parallel strings
- resulting voltage
- resulting kWh
- max charge and discharge figures

### 5. Inverter Array

Start information:

- battery bank summary

Configuration:

- inverter configuration

Result:

- inverter configuration

Feedback:

- `battery bank -> inverter` judgment

Notes:

- despite the page title, this may represent one inverter or multiple inverters
- the page should stay compatible with future multi-inverter modeling

### 6. Branch Circuits / Fusing

Start information:

- inverter summary

Configuration:

- group configuration
- fusing

Result:

- branch-circuit configuration

Feedback:

- `inverter -> branch circuit` judgment

Notes:

- `Branch circuits / fusing` is the preferred term
- this replaces earlier looser fuse-group wording

### 7. Consumers

Start information:

- branch-circuit summary

Configuration:

- consumer group configuration
- consumer configuration

Result:

- configured consumers

Feedback:

- `branch circuit -> consumers` judgment

Notes:

- a consumer may be a single appliance or a modeled grouped load

### 8. Dashboard

Start information:

- all judgments together

Configuration:

- none required as primary function

Result:

- system overview

Feedback:

- combined view of all key judgments across the chain

Notes:

- the dashboard is the summary layer, not the main place for detailed configuration

## Navigation Intent

This structure suggests a cleaner progression:

1. `Location`
2. `Panel array / face`
3. `MPPT configuration / face`
4. `Battery array`
5. `Inverter array`
6. `Branch circuits / fusing`
7. `Consumers`
8. `Dashboard`

The user should be able to move step by step, while the dashboard stays available as the cross-system summary.

## Restart Point

This document should be treated as the new reference for page structure as the UI is cleaned up and rebuilt.

Older screen notes remain useful background, but this file is the current preferred structure for the next implementation pass.
