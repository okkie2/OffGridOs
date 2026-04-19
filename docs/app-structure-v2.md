# App Structure V2

This document defines the new top-level page structure for the digital twin UI.

It replaces the earlier mixed screen direction with a cleaner step-by-step flow.

The core pattern for each page is:

- `Start information`
- `Selection / configuration`
- `Result`
- `Feedback`

This keeps the app consistent. Each page should help the user understand:

- what is already known
- what can be selected or configured now
- what the resulting configuration is
- what the judgment is for the relationship being modeled

## Core Rule

Judgment and fit language only make sense when describing a relationship between two things.

Examples:

- `array -> MPPT`
- `MPPT -> battery array`
- `battery array -> inverter`
- `inverter -> branch circuit`
- `branch circuit -> consumers`

So:

- broad entity pages should avoid vague standalone labels like `Within limits`
- relationship pages may use qualifiers like `optimal`, `acceptable`, `underutilized`, or `outside limits`

## Face Model

Use `face` as the broader concept.

A `face` may be:

- a roof face
- a wall face
- a flat face

`Roof face` is therefore a subtype or common case, not the only type of face.

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
- multiple faces

Result:

- face set / site setup

Feedback:

- completeness
- number of configured faces

Notes:

- this page owns shared location information
- face coordinates and site context should live here, not on individual face pages

### 2. Panel Array / Face

Start information:

- face summary

Selection / configuration:

- panel selection
- panel array configuration

Result:

- configured panel array for that face

Feedback:

- solar output per face

Notes:

- this page is about the face and its array
- it should not drift into MPPT judgment language unless the user moves to the next page

### 3. MPPT Selection / Face

Start information:

- panel array summary

Selection / configuration:

- MPPT selection

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
- all upstream MPPT outputs coming in from the configured faces

Selection / configuration:

- battery selection
- battery array configuration

Result:

- battery array configuration

Feedback:

- `MPPTs -> battery array` judgment

Notes:

- battery count
- batteries per string
- parallel strings
- resulting voltage
- resulting kWh
- max charge and discharge figures

### 5. Inverter Array

Start information:

- battery array summary

Selection / configuration:

- inverter selection

Result:

- inverter configuration

Feedback:

- `battery array -> inverter` judgment

Notes:

- despite the page title, this may represent one inverter or multiple inverters
- the page should stay compatible with future multi-inverter modeling

### 6. Branch Circuits / Fusing

Start information:

- inverter summary

Selection / configuration:

- group selection
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

Selection / configuration:

- consumer selection
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

Selection / configuration:

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
3. `MPPT selection / face`
4. `Battery array`
5. `Inverter array`
6. `Branch circuits / fusing`
7. `Consumers`
8. `Dashboard`

The user should be able to move step by step, while the dashboard stays available as the cross-system summary.

## Restart Point

This document should be treated as the new reference for page structure as the UI is cleaned up and rebuilt.

Older screen notes remain useful background, but this file is the current preferred structure for the next implementation pass.
