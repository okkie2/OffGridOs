# Battery Inverter Screen

This note defines the detailed screen for the battery bank, project inverter, and their surrounding relationships.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

This screen should help the user answer:

- what battery bank is configured
- how the MPPTs feed the battery bank
- whether the battery bank suits the inverter
- where the system is tight, oversized, or seasonally stressed

It is the main DC-chain and storage view.

## Screen scope

This screen should show:

- battery bank configuration
- `MPPT -> battery bank` relationships
- selected inverter
- `battery bank -> inverter` relationship
- monthly battery pressure and seasonal margin

## Layout blocks

Suggested layout:

1. battery bank header
2. battery bank composition section
3. MPPT charging section
4. inverter compatibility section
5. monthly storage pressure section
6. adjustment options section

## 1. Battery bank header

Show:

- battery bank name
- battery type
- battery unit count
- nominal voltage
- total capacity
- usable capacity

Purpose:

- establish the storage backbone of the system

## 2. Battery bank composition section

Show:

- battery model
- chemistry
- series count
- parallel count
- Victron CAN compatibility if relevant
- price context if available

This should make the physical battery-bank setup legible.

## 3. MPPT charging section

Show one block per upstream MPPT relationship.

Each block should include:

- MPPT name
- MPPT type
- output voltage
- output current
- output power
- `electrical_status`
- `fit_status`
- reasons

Purpose:

- show whether the battery bank is a good charging destination for the selected MPPT set

## 4. Inverter compatibility section

This is the second core section.

Show:

- selected inverter
- inverter input voltage
- continuous power
- peak power
- `battery bank -> inverter` evaluation
- key reasons

This should help the user see:

- whether the inverter matches the battery bank
- whether surge and continuous loads are realistic
- whether the inverter is oversized or under pressure

## 5. Monthly storage pressure section

Show month-by-month storage stress.

Suggested values:

- battery charging demand
- battery discharge demand
- low-margin months
- high-surplus months
- autonomy pressure

This section should connect system design to seasonal lived reality.

## 6. Adjustment options section

Suggested adjustable inputs:

- battery type
- battery unit count
- series count
- parallel count
- selected inverter

Suggested guidance:

- `Increase battery capacity`
- `Reduce winter deficit`
- `Review inverter sizing`
- `Accept lower winter margin`

## Key questions this screen should answer

The user should quickly be able to answer:

- Is the battery bank a good match for the MPPT output side?
- Is the battery bank a good match for the inverter?
- Which months stress the storage system most?
- Would it be better to change the battery bank, the inverter, or the upstream PV side?

## Relationship emphasis

This screen should emphasize:

- `MPPT -> battery bank`
- `battery bank -> inverter`

The UI should make it easy to separate:

- hard electrical mismatches
- softer fit issues
- seasonal storage pressure

## Recommendation

The first implemented version of this screen should prioritize:

1. battery-bank summary
2. inverter summary
3. relationship status blocks
4. monthly storage pressure
5. adjustment options

That is enough to make the storage side of the twin understandable.

