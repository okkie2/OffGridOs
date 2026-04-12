# Digital Twin Types

This note defines a first TypeScript-facing object model for the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

This type model sits between:

- SQLite persistence
- calculation logic
- JSON export
- React rendering

It is a design artifact for now, not an implemented code contract yet.

## Design principles

- Keep persisted entities separate from derived evaluation objects.
- Prefer explicit IDs and references over deeply nested ad hoc objects.
- Keep the object graph readable in JSON.
- Use one reusable relationship-evaluation shape across the system.

## Shared scalar types

```ts
type ElectricalStatus = 'within_limits' | 'outside_limits';

type FitStatus =
  | 'optimal'
  | 'acceptable'
  | 'clipping_expected'
  | 'underutilized';
```

## Shared evaluation object

```ts
interface RelationshipEvaluation {
  electrical_status: ElectricalStatus;
  fit_status?: FitStatus;
  reasons: string[];
  notes?: string;
}
```

Rules:

- `fit_status` should normally be present only when `electrical_status` is `within_limits`.
- `reasons` should explain why a connection is outside limits or why a trade-off is acceptable.

## Core entities

```ts
interface RoofFace {
  roof_face_id: string;
  name: string;
  orientation_deg: number;
  tilt_deg: number;
  usable_area_m2?: number;
  notes?: string;
}

interface PanelType {
  panel_type_id: string;
  model: string;
  wp: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  length_mm: number;
  width_mm: number;
  price?: number | null;
  notes?: string;
}

interface String {
  string_id: string;
  roof_face_id: string;
  panel_type_id: string;
  panel_count: number;
  name?: string;
  notes?: string;
}

interface Array {
  array_id: string;
  roof_face_id: string;
  name: string;
  string_ids: string[];
  notes?: string;
}

interface MpptType {
  mppt_type_id: string;
  model: string;
  max_voc: number;
  max_pv_power: number;
  max_charge_current: number;
  nominal_battery_voltage: number;
  notes?: string;
}

interface ProjectMppt {
  project_mppt_id: string;
  mppt_type_id: string;
  name: string;
  notes?: string;
}

interface BatteryType {
  battery_type_id: string;
  model: string;
  chemistry: string;
  nominal_voltage: number;
  capacity_ah: number;
  capacity_kwh: number;
  max_charge_rate?: number | null;
  max_discharge_rate?: number | null;
  victron_can: boolean;
  cooling: 'active' | 'passive';
  price?: number | null;
  price_per_kwh?: number | null;
  source?: string | null;
  url?: string | null;
  notes?: string;
}

interface BatteryBank {
  battery_bank_id: string;
  battery_type_id: string;
  battery_unit_count: number;
  series_count: number;
  parallel_count: number;
  name?: string;
  notes?: string;
}

interface InverterType {
  inverter_id: string;
  model: string;
  input_voltage_v: number;
  output_voltage_v: number;
  continuous_power_w: number;
  peak_power_va: number;
  max_charge_current_a: number;
  efficiency_pct?: number | null;
  price?: number | null;
  notes?: string;
}

interface ProjectInverter {
  project_inverter_id: string;
  inverter_id: string;
  name: string;
  notes?: string;
}

interface BranchCircuit {
  branch_circuit_id: string;
  project_inverter_id: string;
  name: string;
  nominal_voltage_v: number;
  fuse_rating_a?: number | null;
  notes?: string;
}

interface Consumer {
  consumer_id: string;
  branch_circuit_id: string;
  name: string;
  nominal_power_w: number;
  surge_power_w?: number | null;
  daily_energy_kwh?: number | null;
  notes?: string;
}

interface Generator {
  generator_id: string;
  name: string;
  nominal_power_w: number;
  surge_power_w?: number | null;
  fuel_type?: string | null;
  notes?: string;
}
```

## Monthly scenario types

```ts
interface ConsumerMonthlyProfile {
  consumer_id: string;
  month: number;
  energy_factor: number;
  notes?: string;
}

interface GeneratorMonthlyProfile {
  generator_id: string;
  month: number;
  availability_factor: number;
  notes?: string;
}

interface SolarMonthlyProfile {
  roof_face_id?: string;
  array_id?: string;
  month: number;
  solar_factor: number;
  notes?: string;
}
```

## Derived electrical state

These objects should usually be derived, not persisted first.

```ts
interface DerivedStringElectricalState {
  string_id: string;
  voltage_v: number;
  current_a: number;
  power_wp: number;
}

interface DerivedArrayElectricalState {
  array_id: string;
  voltage_v: number;
  current_a: number;
  power_wp: number;
}

interface DerivedBatteryBankState {
  battery_bank_id: string;
  nominal_voltage_v: number;
  capacity_kwh: number;
  usable_capacity_kwh?: number;
}
```

## Relationship types

```ts
interface ArrayToMpptRelationship {
  relationship_id: string;
  from_array_id: string;
  to_project_mppt_id: string;
  input_voltage_v: number;
  input_current_a: number;
  input_power_w: number;
  evaluation: RelationshipEvaluation;
}

interface MpptToBatteryBankRelationship {
  relationship_id: string;
  from_project_mppt_id: string;
  to_battery_bank_id: string;
  output_voltage_v: number;
  output_current_a: number;
  output_power_w: number;
  evaluation: RelationshipEvaluation;
}

interface BatteryBankToInverterRelationship {
  relationship_id: string;
  from_battery_bank_id: string;
  to_project_inverter_id: string;
  supply_voltage_v: number;
  continuous_current_a: number;
  peak_current_a: number;
  evaluation: RelationshipEvaluation;
}

interface InverterToBranchCircuitRelationship {
  relationship_id: string;
  from_project_inverter_id: string;
  to_branch_circuit_id: string;
  nominal_voltage_v: number;
  max_current_a: number;
  evaluation: RelationshipEvaluation;
}

interface BranchCircuitToConsumerRelationship {
  relationship_id: string;
  from_branch_circuit_id: string;
  to_consumer_id: string;
  running_power_w: number;
  peak_power_w: number;
  daily_energy_kwh: number;
  evaluation: RelationshipEvaluation;
}
```

## Aggregate twin shape

```ts
interface DigitalTwin {
  roof_faces: RoofFace[];
  panel_types: PanelType[];
  strings: String[];
  arrays: Array[];
  mppt_types: MpptType[];
  project_mppts: ProjectMppt[];
  battery_types: BatteryType[];
  battery_banks: BatteryBank[];
  inverter_types: InverterType[];
  project_inverters: ProjectInverter[];
  branch_circuits: BranchCircuit[];
  consumers: Consumer[];
  generators: Generator[];
  consumer_monthly_profiles: ConsumerMonthlyProfile[];
  generator_monthly_profiles: GeneratorMonthlyProfile[];
  solar_monthly_profiles: SolarMonthlyProfile[];
  derived: {
    string_states: DerivedStringElectricalState[];
    array_states: DerivedArrayElectricalState[];
    battery_bank_states: DerivedBatteryBankState[];
    array_to_mppt: ArrayToMpptRelationship[];
    mppt_to_battery_bank: MpptToBatteryBankRelationship[];
    battery_bank_to_inverter: BatteryBankToInverterRelationship[];
    inverter_to_branch_circuit: InverterToBranchCircuitRelationship[];
    branch_circuit_to_consumer: BranchCircuitToConsumerRelationship[];
  };
}
```

## Current simplifications

For the current project phase:

- one roof face will usually map to one array
- one array will usually map to one project MPPT
- one battery bank is enough
- one project inverter is enough
- one or more branch circuits will group downstream consumers

In this model, a `Consumer` may be either a concrete appliance or endpoint, or a modeled load group such as living room sockets or a lighting group, as long as it stays below the `BranchCircuit` level.

The type model should still allow future expansion without renaming the core concepts.

## Recommendation

Use this note to guide:

1. future TypeScript interface additions
2. the JSON export contract
3. the first SQLite migration slice

Do not copy these types directly into code without first deciding which ones are:

- persisted entities
- derived calculator outputs
- export-only view models
