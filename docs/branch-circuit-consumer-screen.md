# Branch Circuit Consumer Screen

This note defines the detailed screen for branch circuits, consumers, and downstream distribution.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

This screen should help the user answer:

- how the inverter output is distributed
- which branch circuits exist
- which consumers sit on each branch circuit
- whether any branch circuit is overloaded or underused
- which loads drive downstream demand

It is the main AC-side distribution view.

## Screen scope

This screen should show:

- selected inverter configuration
- branch circuits downstream of that inverter
- consumers grouped by branch circuit
- `inverter -> branch circuit` evaluations
- `branch circuit -> consumer` evaluations

## Layout blocks

Suggested layout:

1. inverter output header
2. branch-circuit summary section
3. branch-circuit detail list
4. consumer detail section
5. monthly demand section
6. adjustment options section

## 1. Inverter output header

Show:

- selected inverter configuration
- output voltage
- continuous power
- peak power
- number of branch circuits
- total connected consumer load

Purpose:

- re-establish the AC-side source context

## 2. Branch-circuit summary section

Show one summary card per branch circuit.

Each card should include:

- branch circuit name
- fuse or breaker rating
- nominal voltage
- number of consumers
- total nominal load
- total peak load
- relationship status

This gives a quick scan of which branch circuits deserve attention.

## 3. Branch-circuit detail list

For each branch circuit, show:

- connected consumers
- aggregated running power
- aggregated surge power
- aggregated daily energy if available
- `inverter -> branch circuit` evaluation

This is where the user understands how the protected groups are behaving.

## 4. Consumer detail section

Within each branch circuit, show individual consumers or modeled load groups.

Each item should include:

- consumer name
- whether it is an appliance, endpoint, or grouped load
- nominal power
- surge power
- daily energy
- `branch circuit -> consumer` evaluation

Example consumers:

- washing machine
- pump
- living room sockets
- upstairs lighting
- oven

## 5. Monthly demand section

Show monthly demand from the downstream side.

Suggested values:

- branch-circuit demand by month
- consumer demand by month
- high-pressure months
- low-usage months

Purpose:

- connect the consumer side to the seasonal energy model

## 6. Adjustment options section

Suggested adjustable items:

- branch circuit definition
- fuse or breaker rating
- consumer grouping
- consumer energy assumptions
- consumer monthly factors

Suggested actions:

- `Move consumer to another branch circuit`
- `Split overloaded branch circuit`
- `Aggregate small loads`
- `Refine monthly demand assumptions`

## Key questions this screen should answer

The user should quickly be able to answer:

- Which branch circuits are close to their limits?
- Which consumers dominate demand?
- Are consumers grouped sensibly?
- Is the current downstream distribution realistic?

## Relationship emphasis

This screen should emphasize:

- `inverter -> branch circuit`
- `branch circuit -> consumer`

The UI should help the user distinguish:

- electrical overload
- poor grouping
- high surge demand
- high seasonal demand

## Recommendation

The first implemented version of this screen should prioritize:

1. branch-circuit cards
2. consumer grouping
3. branch loading summary
4. downstream relationship status
5. monthly demand context

That is enough to make the AC-side distribution understandable.
