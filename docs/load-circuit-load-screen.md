# Load Circuit Load Screen

This note defines the detailed screen for load circuits, loads, and downstream distribution.

Generator modeling does not live on this screen; it belongs to the producer-side aggregate view.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

This screen should help the user answer:

- how the inverter output is distributed
- which load circuits exist
- which loads sit on each load circuit
- whether any load circuit is overloaded or underused
- which loads drive downstream demand

It is the main AC-side distribution view.

The consumer-side aggregate page is where downstream demand and sizing belong.

## Screen scope

This screen should show:

- selected inverter configuration
- load circuits downstream of that inverter
- loads grouped by load circuit
- `inverter -> load circuit` evaluations
- `load circuit -> load` evaluations

It should not try to model monthly supply contribution or generator contribution; those belong to the producer-side aggregate and reports.

## Layout blocks

Suggested layout:

1. inverter output header
2. load-circuit summary section
3. load-circuit detail list
4. load detail section
5. monthly demand section
6. adjustment options section

## 1. Inverter output header

Show:

- selected inverter configuration
- output voltage
- continuous power
- peak power
- number of load circuits
- total connected load

Purpose:

- re-establish the AC-side source context

## 2. Load-circuit summary section

Show one summary card per load circuit.

Each card should include:

- load circuit name
- fuse or breaker rating
- nominal voltage
- number of loads
- total nominal load
- total peak load
- relationship status

This gives a quick scan of which load circuits deserve attention.

## 3. Load-circuit detail list

For each load circuit, show:

- connected loads
- aggregated running power
- aggregated surge power
- aggregated daily energy if available
- `inverter -> load circuit` evaluation

This is where the user understands how the protected groups are behaving.

## 4. Load detail section

Within each load circuit, show individual loads or modeled load groups.

Each item should include:

- load name
- whether it is an appliance, endpoint, or grouped load
- nominal power
- surge power
- daily energy
- `load circuit -> load` evaluation

Example loads:

- washing machine
- pump
- living room sockets
- upstairs lighting
- oven

## 5. Monthly demand section

Show monthly demand from the downstream side.

Suggested values:

- load-circuit demand by month
- high-pressure months
- low-usage months

Purpose:

- connect the load-circuit side to the seasonal energy model

## 6. Adjustment options section

Suggested adjustable items:

- load circuit definition
- fuse or breaker rating
- load grouping
- load energy assumptions

Suggested actions:

- `Move load to another load circuit`
- `Split overloaded load circuit`
- `Aggregate small loads`

## Key questions this screen should answer

The user should quickly be able to answer:

- Which load circuits are close to their limits?
- Which loads dominate the circuit demand?
- Are loads grouped sensibly?
- Is the current downstream distribution realistic?

## Relationship emphasis

This screen should emphasize:

- `inverter -> load circuit`
- `load circuit -> load`

The UI should help the user distinguish:

- electrical overload
- poor grouping
- high surge demand
- high seasonal demand

## Recommendation

The first implemented version of this screen should prioritize:

1. load-circuit cards
2. load grouping
3. load-circuit loading summary
4. downstream relationship status
5. monthly demand context

That is enough to make the AC-side distribution understandable.

## Current Implementation Note

The current UI now shows a first-pass demand summary on the load-circuit cards:

- load count
- nominal power
- surge power
- daily energy
- estimated monthly energy

This is still a derived summary rather than a persisted monthly-profile model, but it gives the AC-side screen a concrete energy dimension while the richer monthly and generator modeling work remains on the roadmap.

The next consumer-side monthly demand slice should extend that derived summary with:

- monthly demand by load circuit
- monthly demand by load
- explicit downstream relationship evaluation
- enough totals for the monthly balance screen to compare consumer demand against producer-side supply
