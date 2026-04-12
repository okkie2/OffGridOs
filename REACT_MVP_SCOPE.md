# React MVP Scope

This note defines the first realistic MVP scope for the OffGridOS React app.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The digital twin design is now broad enough that implementation should start from a narrow, useful first version.

This note defines:

- what the first React build should include
- what it should explicitly postpone
- what export data it depends on

## MVP goal

The first React build should let the user:

- inspect the system clearly
- understand the PV side
- understand the storage and inverter side
- see seasonal behavior month by month

It does not need to be a full editable engineering workbench yet.

## Included in MVP

### 1. Overview screen

Include:

- summary header
- system chain overview
- relationship status strip
- monthly balance summary
- roof-face cards

Reference:

- [FIRST_SCREEN_LAYOUT.md](./FIRST_SCREEN_LAYOUT.md)

### 2. Roof face / array / MPPT screen

Include:

- roof face geometry
- panel assignment
- string summary
- array summary
- selected MPPT
- `array -> MPPT` evaluation
- monthly roof-face or array performance

Reference:

- [ROOF_FACE_ARRAY_SCREEN.md](./ROOF_FACE_ARRAY_SCREEN.md)

### 3. Battery / inverter screen

Include:

- battery bank summary
- selected inverter
- `MPPT -> battery bank` evaluation
- `battery bank -> inverter` evaluation
- monthly storage pressure

Reference:

- [BATTERY_INVERTER_SCREEN.md](./BATTERY_INVERTER_SCREEN.md)

### 4. Monthly balance screen

Include:

- yearly summary
- 12-month chart
- monthly detail rows
- weakest month
- strongest month
- seasonal interpretation

Reference:

- [MONTHLY_BALANCE_SCREEN.md](./MONTHLY_BALANCE_SCREEN.md)

## Optional but not required for MVP

These can exist in a minimal or summary-only form without being full screens yet:

- branch circuits
- consumers
- generator detail

If present in MVP, they should be read-only summaries, not deep editable workflows.

## Explicitly postponed

Do not require these in the first React MVP:

- full AC-side editing
- branch-circuit restructuring
- rich consumer usage-profile editing
- hourly simulation
- automatic optimization
- interactive multi-scenario planning
- fully editable project configuration through the React app

## Interaction model for MVP

The MVP should be primarily:

- read-only
- inspect-first
- explanation-first

The app should help the user understand:

- what is connected
- where the system is strong
- where it is weak
- what trade-offs are happening

It should not yet try to replace the whole design workflow.

## Required export data for MVP

The JSON export should at minimum include:

### Entities

- `roof_faces`
- `panel_types`
- `arrays`
- `project_mppts`
- `battery_banks`
- `project_inverters`

### Relationships

- `array_to_mppt`
- `mppt_to_battery_bank`
- `battery_bank_to_inverter`

### Derived

- `array_states`
- `battery_bank_states`
- `monthly_balance`
- `summary`
- top-level warnings if available

## Not required for the first MVP export

The first export does not need to fully include:

- branch-circuit detail
- consumer monthly profiles
- generator monthly profiles
- all downstream AC relationship objects

Those can be added in later versions.

## Why this MVP is the right size

This scope is small enough to build, but large enough to show the core value of the digital twin.

It covers:

- PV input reasoning
- storage reasoning
- seasonal reasoning

That is already enough to make the app valuable.

## Recommendation

The first implementation phase should be:

1. build the export data needed for this MVP
2. build the overview screen
3. build the roof-face / array / MPPT screen
4. build the battery / inverter screen
5. build the monthly balance screen

Only after that should the app expand further downstream.

