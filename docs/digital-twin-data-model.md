# Digital Twin Data Model

This note defines the first concrete data-model draft for the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

This model is the bridge between:

- the local SQLite database
- the JSON export
- the future React inspection app

It should make the component graph explicit and keep a clean distinction between:

- user inputs
- derived components
- evaluated relationships
- monthly variation

## Modeling principles

- Keep entities separate from relationships.
- Keep editable inputs separate from derived outputs.
- Evaluate important relationships with both `electrical_status` and `fit_status`.
- Allow the general model to be more flexible than the current project setup.
- Keep the JSON export readable and stable enough for frontend use.

## Entities

### Surface

Represents one physical surface.

Key fields:

- `surface_id`
- `name`
- `orientation_deg`
- `tilt_deg`
- `usable_area_m2`
- `notes`

### Panel type

Represents one selectable panel model.

Key fields:

- `panel_type_id`
- `model`
- `wp`
- `voc`
- `vmp`
- `isc`
- `imp`
- `length_mm`
- `width_mm`
- `price`
- `notes`

### PvString

Represents one series-connected set of panels.

Key fields:

- `pv_string_id`
- `surface_id`
- `panel_type_id`
- `panel_count`
- `derived_voltage_v`
- `derived_current_a`
- `derived_power_wp`

### PvArray

Represents one PV grouping connected to one MPPT.

Key fields:

- `pv_array_id`
- `surface_id`
- `name`
- `string_ids`
- `derived_voltage_v`
- `derived_current_a`
- `derived_power_wp`
- `notes`

Current project assumption:

- each surface has one array
- each array feeds one MPPT

General model allowance:

- a surface may have more than one array later

### MPPT

Represents one MPPT solar charger instance in the design.

Key fields:

- `mppt_id`
- `mppt_type_id`
- `name`
- `max_voc`
- `max_pv_power`
- `max_charge_current`
- `nominal_battery_voltage`
- `notes`

### Battery bank

Represents the configured battery system.

Key fields:

- `battery_bank_id`
- `battery_type_id`
- `battery_unit_count`
- `series_count`
- `parallel_count`
- `nominal_voltage`
- `capacity_kwh`
- `usable_capacity_kwh`
- `notes`

### Inverter type

Represents one inverter or inverter/charger in the design.

Key fields:

- `inverter_type_id`
- `model`
- `input_voltage_v`
- `output_voltage_v`
- `continuous_power_w`
- `peak_power_va`
- `efficiency_pct`
- `notes`

### Load circuit

Represents one protected distribution group downstream of a source.

Key fields:

- `load_circuit_id`
- `name`
- `nominal_voltage_v`
- `fuse_rating_a`
- `source_side`
- `notes`

### Load

Represents one electrical load.

Examples:

- washing machine
- light socket
- pump
- oven
- fridge
- living room sockets
- upstairs lighting

Key fields:

- `load_id`
- `name`
- `load_circuit_id`
- `nominal_current_a`
- `nominal_power_w`
- `startup_current_a`
- `surge_power_w`
- `standby_power_w`
- `daily_energy_kwh`
- `duty_profile`
- `expected_usage_hours_per_day`
- `notes`

The inherited circuit supply type and voltage live on the load circuit side of the model, not on the load itself.

Legacy aliases still accepted during the transition:

- `usage_kw`
- `spike_kw`
- `sleeping_kw`

### Generator

Represents one generator source used as backup or supplemental supply.

Key fields:

- `generator_id`
- `name`
- `nominal_power_w`
- `surge_power_w`
- `fuel_type`
- `availability_profile`
- `notes`

### Monthly profile

Represents seasonal variation over the twelve months.

Key fields:

- `profile_id`
- `month`
- `solar_factor`
- `consumption_factor`
- `generator_availability`
- `notes`

## Load granularity

A `load` may be either:

- a concrete endpoint or appliance
- a modeled load group within one load circuit

Good examples:

- washing machine
- light socket
- pump
- oven
- fridge
- living room sockets
- room lighting group

Use `load_circuit` for the protected electrical group above the load level.

Use `load` for the load item you want to reason about in the model.

That means a room or socket group can be a `load` if it is being modeled as one load item within a load circuit.

## Relationships

Relationships should be explicit model objects, not only implied by foreign keys.

See [digital-twin-types.md](./digital-twin-types.md) for the TypeScript definitions of these relationship objects.

### Array to MPPT

Fields:

- `relationship_id`
- `from_pv_array_id`
- `to_mppt_configuration_id`
- `electrical_status`
- `fit_status`
- `derived_input_voltage_v`
- `derived_input_current_a`
- `derived_input_power_w`
- `notes`
- `reasons`

### MPPT to battery bank

Fields:

- `relationship_id`
- `from_mppt_configuration_id`
- `to_battery_bank_id`
- `electrical_status`
- `fit_status`
- `derived_output_voltage_v`
- `derived_output_current_a`
- `derived_output_power_w`
- `notes`
- `reasons`

### Battery bank to inverter

Fields:

- `relationship_id`
- `from_battery_bank_id`
- `to_inverter_configuration_id`
- `electrical_status`
- `fit_status`
- `derived_supply_voltage_v`
- `derived_peak_current_a`
- `derived_continuous_current_a`
- `notes`
- `reasons`

### Inverter to load circuit

Fields:

- `relationship_id`
- `from_inverter_configuration_id`
- `to_load_circuit_id`
- `electrical_status`
- `fit_status`
- `derived_nominal_voltage_v`
- `derived_max_current_a`
- `notes`
- `reasons`

### Load circuit to load

Fields:

- `relationship_id`
- `from_load_circuit_id`
- `to_load_id`
- `electrical_status`
- `fit_status`
- `derived_running_power_w`
- `derived_peak_power_w`
- `derived_daily_energy_kwh`
- `notes`
- `reasons`

## Relationship evaluation

Every important relationship should expose:

- `electrical_status`
- `fit_status`
- `reasons`
- derived measurement values

### Electrical status

Allowed values:

- `within_limits`
- `outside_limits`

### Fit status

Allowed values:

- `optimal`
- `fully_utilized`
- `clipping_expected`
- `underutilized`

## Input vs derived

### Typically user inputs

- surface geometry and orientation
- panel type
- panel count
- battery type
- battery unit count
- generator presence and availability
- load definitions
- load circuit definitions
- monthly factors

### Typically derived

- string voltage, current, and power
- array voltage, current, and power
- relationship electrical status
- relationship fit status
- battery charging behaviour
- inverter loading
- fuse suggestions
- wiring suggestions
- monthly surplus and deficit

## Current project simplifications

The general model should remain flexible, but the current project can start with:

- one array per surface
- one MPPT per array
- one battery bank
- one inverter
- a small number of load circuits
- monthly variation as twelve scalar rows rather than a complex simulation object

## JSON export shape

See [json-export-shape.md](./json-export-shape.md) for the authoritative definition of the API export contract.

## Implementation order

1. Define the database extension for the new entities.
2. Define the export builder from SQLite to JSON.
3. Export a first static JSON snapshot.
4. Build the React app against that export contract.
5. Add more detailed relationship evaluation once the object graph is stable.
