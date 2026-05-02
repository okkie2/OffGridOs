# Persistence Testing Strategy

This note defines the recommended testing strategy for OffGridOS save behavior.

The goal is simple:

- every editable field should either save correctly or fail loudly
- no field should appear saved in the UI but disappear after reload
- box-level saves should remain safe even when one box depends on another

## Current decision

For now, keep the current save-per-box interaction model.

That means we do not redesign the app around one giant page-level save yet.
Instead, we make the current save model reliable through stronger persistence testing and clearer verification.

## Why this strategy fits OffGridOS

Several pages contain dependency chains between save boxes.

Example on a `Surface` page:

1. `Panel setup`
2. `Panel array`
3. `MPPT selection`

These are not fully independent.
For example, the saved string layout must match the already-persisted panel count.

Because of that, the safest short-term approach is:

- keep save-per-box
- test each box as its own persistence contract
- test the dependency transitions between boxes
- add a full page audit scenario that checks the whole chain after reload

## Core testing rule

For every save box, every happy-path persistence test should verify all of the following:

1. enter values in the UI
2. click the relevant save button
3. observe a successful response
4. reload the app from persisted data
5. confirm the same values are still present

Do not treat a success message alone as proof of persistence.

## Test layers

Use four layers together.

### 1. Route and persistence integration tests

These should be the main safety net.

For each save route:

- submit a valid payload with every field populated
- confirm the route returns success
- confirm the values appear in persisted readback
- submit an edited payload and confirm the update persists
- clear optional values and confirm clearing persists
- submit invalid payloads and confirm the route rejects them

This layer should directly cover routes such as:

- `/api/location`
- `/api/surfaces/:surfaceId`
- `/api/surface-panel-assignments/:surfaceId`
- `/api/surface-configurations/:surfaceId`
- `/api/battery-bank-configuration`
- `/api/inverter-configuration`
- catalog CRUD routes for panel, MPPT, battery, and inverter types

### 2. BDD workflow tests

BDD scenarios should reflect how a real user works through the app.

Recommended scenario shape:

- open the relevant page
- change every field in one save box
- save that box
- reload the app
- reopen the same page
- verify all changed fields

BDD should also cover the transitions between dependent boxes.

### 3. Validation and rule-focused tests

Use targeted tests for cross-field logic that can reject saves.

Examples:

- string layout must match the persisted panel count
- zero panels requires zero panels per string and zero parallel strings
- battery count must equal batteries per string multiplied by parallel strings
- selected catalog ids must exist

These tests should focus on the exact rule and produce clear failures.

### 4. Full page audit scenarios

Add one broad persistence scenario per major page.

A page audit should:

- change all save boxes on the page
- save them in a valid dependency order
- reload the app
- verify the full page state

This is the best automated defense against the real-world failure mode:

"I pressed save, came back later, and some fields were gone."

## Save-box contracts

Treat each save box as a contract with its own field inventory, success cases, clear cases, and error cases.

### Location

Save contract:

- title
- country
- description
- notes
- latitude
- longitude
- site photo

Test categories:

- all fields persist
- edit existing values
- clear optional fields
- invalid latitude or longitude is rejected

### Surface details

Save contract:

- name
- description
- orientation
- tilt
- height
- width
- derived usable area via persisted readback
- notes
- photo

Test categories:

- all fields persist
- derived area updates after saving height and width
- optional text and media can be cleared
- invalid orientation or tilt is rejected

### Panel setup

Save contract:

- selected panel type
- panel count

Test categories:

- save non-zero panel count with panel type
- save zero panel count and clear assignment
- reject non-zero count without panel type
- reload confirms persisted count and selected type

### Surface configuration

Save contract:

- panels per string
- parallel strings
- selected MPPT type

Test categories:

- save matching string layout after panel setup is saved
- reject layout that does not match persisted panel count
- reject non-zero layout when persisted panel count is zero
- reject unknown MPPT type
- reload confirms saved layout and MPPT choice

### Battery bank

Save contract:

- title
- description
- image
- notes
- selected battery type
- configured battery count
- batteries per string
- parallel strings

Test categories:

- all fields persist
- battery count must match batteries per string times parallel strings
- selected battery type must exist
- optional text and image can be cleared

### Inverter configuration

Save contract:

- selected inverter type
- title
- description
- image
- notes

Test categories:

- all fields persist
- selected inverter type is required
- selected inverter type must exist
- optional text and image can be cleared

### Consumption converter

Save contract:

- title
- description
- selected converter type

Test categories:

- all fields persist
- selected converter type must exist
- edit existing values
- clear optional text fields

### Load circuits

Save contract:

- parent converter context
- title
- description

Test categories:

- all fields persist
- converter context remains attached after reload
- optional description can be cleared

### Loads

Save contract:

- parent circuit context
- title
- description
- nominal current
- nominal power
- startup current
- surge power
- standby power
- expected usage hours per day
- daily energy
- duty profile
- notes

Test categories:

- all fields persist
- parent circuit context remains attached after reload
- optional numeric and text fields can be cleared
- full page audit confirms the load remains under the same circuit after reload

### Catalog editors

Create matching persistence tests for:

- panel types
- MPPT types
- battery types
- inverter types

For each catalog editor, cover:

- create
- read after reload
- update
- clear optional fields
- invalid numeric values rejected
- delete blocked when still referenced, where applicable

## Dependency-aware scenarios

OffGridOS should explicitly test the transitions between dependent save boxes.

### Surface dependency chain

Recommended sequence:

1. save `Panel setup`
2. save matching `Surface configuration`
3. save or change `MPPT` selection inside that configuration
4. reload
5. verify the whole persisted chain

Important scenarios:

1. Save panel count `12`, then save layout `3 x 4`, then reload and confirm success.
2. Save panel count `12`, then try layout `5 x 2`, then confirm rejection.
3. Change the on-screen panel count but do not save it, then attempt to save a layout that only matches the unsaved draft, then confirm behavior follows persisted state.
4. Save a new panel count, then save a newly matching layout, then reload and confirm the full chain persists.

## Field inventory requirement

Maintain one field inventory table for all persisted fields.

Each row should record:

- page
- save box
- field label
- persisted property name
- route
- valid example value
- clear value if allowed
- invalid example value
- which automated test covers it

This table becomes the coverage contract for "all fields".

## Readback oracle

Whenever practical, verify persistence through a fresh readback from persisted project data rather than through in-memory UI state alone.

Preferred order:

1. save through the UI or route
2. reload the app or re-fetch the digital twin export
3. assert against the persisted values

This avoids false confidence from local draft state.

## UI safeguards that support testing

Even without changing the save mechanism, a few UI behaviors should support safer operation:

- button labels should be explicit, such as `Save panel setup` and `Save array layout`
- each box should expose a dirty state
- navigating away with dirty boxes should warn the user
- success messaging should say exactly what was saved

These are not substitutes for persistence tests, but they reduce real-world mistakes.

## Definition of done for save reliability

Save reliability for a page is acceptable when:

1. every save box on that page has a happy-path persistence test
2. every optional field has a clear-value persistence test where relevant
3. every cross-field validation rule has at least one focused rejection test
4. the page has one full reload audit scenario
5. the field inventory shows explicit coverage for every persisted field

## Recommended rollout order

1. Cover `Location`
2. Cover `Surface details`
3. Cover `Panel setup`
4. Cover `Surface configuration`
5. Cover `Battery bank`
6. Cover `Inverter configuration`
7. Cover catalog editors
8. Add page audit scenarios

This order matches the highest-value persisted flows first.
