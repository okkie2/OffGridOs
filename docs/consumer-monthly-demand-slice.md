# Consumer Monthly Demand Slice

This note turns the remaining consumer-side roadmap item into an implementation checklist.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

Build the downstream monthly-demand side of the system in a way that can feed the monthly balance screen without mixing generator logic into the consumer model.

This slice should answer:

- how much monthly demand each load contributes
- how much monthly demand each load circuit contributes
- which downstream relationships are under pressure
- what the consumer-side monthly total looks like before it is compared with producer-side supply

## Scope

This slice stays on the consumer side:

- `Load circuits`
- `Loads`
- downstream relationship evaluation
- monthly demand aggregation

Generator supply stays on the producer side and is only consumed later by monthly balance.

## Persisted tables

Start from the existing persisted entities:

- `load_circuits`
- `loads`

The first implementation derives monthly demand from the current load fields (`daily_energy_kwh`, `expected_usage_hours_per_day`, and power values) so the consumer side becomes visible immediately.

If the project later needs editable month-by-month overrides, add a dedicated `load_monthly_profiles` table after the derived baseline has settled.

## Export and API fields

The export contract should expose the consumer-demand inputs and derived totals explicitly.

Existing fields already in the contract:

- `entities.load_circuits`
- `entities.loads`
- `relationships.inverter_to_load_circuit`
- `relationships.load_circuit_to_load`

Derived fields to add or formalize for the consumer slice:

- `derived.consumer_monthly_demand`
- `derived.load_circuit_monthly_demand`
- `derived.load_monthly_demand`

Suggested shape:

```ts
type ConsumerMonthlyDemandRow = {
  month: number;
  load_circuit_id: string;
  load_id?: string | null;
  demand_kwh: number;
  notes?: string | null;
};
```

If the implementation prefers a single rollup, keep the same row shape but aggregate by `load_circuit_id` and omit `load_id`.

## UI outputs

### Loads workbench

Show:

- monthly demand per load
- load-level pressure or contribution
- enough energy context to explain why a load matters in the monthly balance

### Load circuits workbench

Show:

- monthly demand per load circuit
- monthly totals for all loads in the circuit
- downstream relationship status
- whether the circuit is driving the monthly load profile

### Monthly balance screen

Show:

- consumer-side monthly demand totals
- producer-side monthly supply totals
- surplus or deficit per month
- strongest and weakest months

## Implementation checklist

1. Derive monthly load demand from the existing load fields.
2. Roll the monthly load demand up to `load_circuits`.
3. Add derived consumer-demand rows to the export contract.
4. Render the consumer demand summary on the Load circuits workbench.
5. Render the load-level monthly demand on the Loads workbench where it helps the user understand the circuit.
6. Feed the consumer demand totals into the monthly balance screen.
7. Add regression coverage for the consumer-demand totals and the monthly balance handoff.

## Acceptance criteria

This slice is complete when:

- each load can contribute a month-by-month demand value
- each load circuit can show its rolled-up monthly demand
- the monthly balance screen can compare consumer demand against producer supply
- generator supply is still modeled only on the producer side
- the export contract remains the single source of truth for the UI

## Non-goals

Do not add generator logic here.

Do not introduce hourly simulation.

Do not make the UI depend on generated JSON files as a durable source of truth.
