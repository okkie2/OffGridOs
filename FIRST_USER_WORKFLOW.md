# First User Workflow

This note defines the first useful user workflow for the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The digital twin now has:

- a terminology model
- a data model
- a relationship-evaluation model

This note turns those into a concrete first workflow for the user.

## First useful workflow

The first useful workflow should follow the electrical chain in order:

1. define roof faces
2. assign panel types and panel counts
3. derive or confirm strings
4. derive or confirm arrays
5. choose MPPTs and inspect `array -> MPPT` fit
6. define the battery bank and inspect `MPPT -> battery bank` fit
7. choose the inverter and inspect `battery bank -> inverter` fit
8. define branch circuits
9. define consumers
10. inspect monthly balance

## Step details

### 1. Roof faces

The user should see:

- roof face name
- orientation
- tilt
- usable area

The purpose here is orientation and physical context.

### 2. Panel assignment

The user should choose per roof face:

- panel type
- panel count

For the current project baseline, this is already partly present in `project.db`.

### 3. String definition

The user should be able to:

- accept an automatically suggested string layout
- or define strings manually

This is where series grouping becomes explicit.

### 4. Array definition

The user should see or define:

- which strings belong to which array
- which roof face each array belongs to

For the current project phase, one roof face will usually map to one array.

### 5. MPPT selection

The user should:

- select an MPPT for each array
- immediately see `electrical_status`
- immediately see `fit_status`
- see the derived voltage, current, and power values

This is one of the most important early views in the twin.

### 6. Battery-bank definition

The user should define:

- battery type
- battery unit count
- series count
- parallel count

The system should then evaluate `MPPT -> battery bank`.

### 7. Inverter selection

The user should:

- choose an inverter
- inspect `battery bank -> inverter`

This should make both power limits and seasonal practicality visible.

### 8. Branch-circuit definition

The user should define:

- branch circuit name
- fuse or breaker rating
- nominal voltage

This creates the protected downstream groups.

### 9. Consumer definition

The user should define consumers inside branch circuits.

A consumer may be:

- one appliance
- one endpoint
- one modeled load group

Examples:

- washing machine
- pump
- living room sockets
- upstairs lighting

### 10. Monthly balance

The user should then inspect month-by-month outcomes:

- energy demand
- solar contribution
- generator contribution
- surplus
- deficit
- pressure on the battery bank

## First UI views

The first React version should probably have these views:

### Project overview

Shows:

- main components
- high-level warnings
- quick summary by month

### Roof face and array view

Shows:

- roof faces
- panel assignment
- strings
- arrays

### MPPT fit view

Shows:

- each array
- selected MPPT
- `electrical_status`
- `fit_status`
- key reasons

### Battery and inverter view

Shows:

- battery bank
- project inverter
- relationship evaluations in the DC chain

### Branch circuits and consumers view

Shows:

- branch circuits
- consumer items
- branch loading and consumer distribution

### Monthly balance view

Shows:

- all 12 months
- energy balance
- seasonal weak points
- clipping or underutilization where relevant

## Interaction pattern

The app should support two modes of thinking:

### Upstream change

The user changes:

- roof face panel count
- panel type
- MPPT
- battery bank

The app shows downstream effects.

### Downstream goal

The user changes or selects a desired result such as:

- more winter margin
- less generator dependence
- more battery autonomy

The app should show what needs to change upstream.

## Recommendation

The first implemented React version should not try to cover the whole twin equally.

The most valuable first focus is:

1. roof face -> array -> MPPT
2. MPPT -> battery bank
3. monthly balance summary

That is enough to make the digital twin useful early.

