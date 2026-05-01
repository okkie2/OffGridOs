# Digital Twin DB Extension

This note proposes how to extend the current SQLite schema toward the digital twin model.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

The goal is to decide:

- what should be stored in SQLite
- what should remain derived at export or calculation time
- what should wait until later

This proposal is intentionally pragmatic.
It prefers a small number of stable persisted entities over storing every derived value in the database.

## Current schema baseline

The current database already contains:

- `locations`
- `surfaces`
- `panel_types`
- `surface_panel_assignments`
- `mppt_types`
- `battery_types`
- `project_preferences`
- `inverter_types`

This gives us:

- site context
- surface geometry
- panel catalog
- panel count per surface
- MPPT catalog
- battery catalog
- inverter catalog

What is still missing for the digital twin:

- pv_strings
- pv_arrays
- configured MPPT instances
- configured battery bank
- configured inverter instances
- load circuits
- loads
- generator
- monthly profiles

## Design choice

Persist:

- user-chosen system structure
- catalog references
- topology identifiers
- monthly assumptions

Do not persist yet:

- relationship evaluation outputs
- electrical status results
- fit status results
- seasonal simulation outputs
- warnings and recommendations

Those should be derived by calculations and exported into JSON.

## Proposed new tables

### `pv_strings`

Purpose:

- store the user-defined or accepted series strings on a surface

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `string_id TEXT UNIQUE NOT NULL`
- `surface_id TEXT NOT NULL REFERENCES surfaces(surface_id)`
- `panel_type_id TEXT NOT NULL REFERENCES panel_types(panel_type_id)`
- `panel_count INTEGER NOT NULL`
- `name TEXT`
- `notes TEXT`

Persist rationale:

- strings are part of the intended topology, not just a momentary calculation result

### `pv_arrays`

Purpose:

- store the MPPT-fed PV grouping

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `array_id TEXT UNIQUE NOT NULL`
- `surface_id TEXT NOT NULL REFERENCES surfaces(surface_id)`
- `name TEXT NOT NULL`
- `notes TEXT`

Persist rationale:

- arrays are topological design objects and the main PV-to-MPPT unit

### `array_strings`

Purpose:

- map strings into arrays

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `array_id TEXT NOT NULL REFERENCES pv_arrays(array_id)`
- `string_id TEXT NOT NULL REFERENCES pv_strings(string_id)`
- `sort_order INTEGER`

Persist rationale:

- keeps the general model flexible for more than one string per array

### `mppt_configurations`

Purpose:

- store the actual MPPT instances selected for the project

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `mppt_configuration_id TEXT UNIQUE NOT NULL`
- `mppt_type_id TEXT NOT NULL REFERENCES mppt_types(mppt_type_id)`
- `name TEXT NOT NULL`
- `notes TEXT`

Persist rationale:

- separates the catalog (`mppt_types`) from project configuration

### `array_mppts`

Purpose:

- map one array to one selected MPPT instance

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `array_id TEXT NOT NULL REFERENCES pv_arrays(array_id)`
- `mppt_configuration_id TEXT NOT NULL REFERENCES mppt_configurations(mppt_configuration_id)`

Rules:

- in the current project direction, this should be `1:1`

### `battery_banks`

Purpose:

- store the configured battery bank for the project

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `battery_bank_id TEXT UNIQUE NOT NULL`
- `battery_type_id TEXT NOT NULL REFERENCES battery_types(battery_type_id)`
- `battery_unit_count INTEGER NOT NULL`
- `series_count INTEGER NOT NULL`
- `parallel_count INTEGER NOT NULL`
- `name TEXT`
- `notes TEXT`

Persist rationale:

- battery bank configuration is a user design choice

### `mppt_battery_banks`

Purpose:

- connect project MPPT instances to the battery bank they charge

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `mppt_configuration_id TEXT NOT NULL REFERENCES mppt_configurations(mppt_configuration_id)`
- `battery_bank_id TEXT NOT NULL REFERENCES battery_banks(battery_bank_id)`

### `inverter_configurations`

Purpose:

- store the actual inverter or inverter/charger instances selected for the project

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `inverter_configuration_id TEXT UNIQUE NOT NULL`
- `inverter_type_id TEXT NOT NULL REFERENCES inverter_types(inverter_id)`
- `name TEXT NOT NULL`
- `notes TEXT`

Persist rationale:

- separates the inverter catalog from configured system instances

### `battery_bank_inverters`

Purpose:

- connect the battery bank to one or more inverter configuration instances

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `battery_bank_id TEXT NOT NULL REFERENCES battery_banks(battery_bank_id)`
- `inverter_configuration_id TEXT NOT NULL REFERENCES inverter_configurations(inverter_configuration_id)`

### `load_circuits`

Purpose:

- store protected downstream groups

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `load_circuit_id TEXT UNIQUE NOT NULL`
- `inverter_configuration_id TEXT NOT NULL REFERENCES inverter_configurations(inverter_configuration_id)`
- `name TEXT NOT NULL`
- `nominal_voltage_v REAL NOT NULL`
- `fuse_rating_a REAL`
- `notes TEXT`

Persist rationale:

- load circuits are real design objects, not just reporting output

### `loads`

Purpose:

- store loads attached to load circuits

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `load_id TEXT UNIQUE NOT NULL`
- `load_circuit_id TEXT NOT NULL REFERENCES load_circuits(load_circuit_id)`
- `name TEXT NOT NULL`
- `nominal_current_a REAL`
- `nominal_power_w REAL NOT NULL`
- `startup_current_a REAL`
- `surge_power_w REAL`
- `standby_power_w REAL`
- `expected_usage_hours_per_day REAL`
- `daily_energy_kwh REAL`
- `duty_profile TEXT`
- `notes TEXT`

The circuit's attached conversion device provides the inherited supply type and voltage context for each load.

Migration note:

- keep old `usage_kw`, `spike_kw`, and `sleeping_kw` aliases only as compatibility fields while the model transitions to neutral electrical names

### `load_monthly_profiles`

Purpose:

- store month-by-month load variation for each load

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `load_id TEXT NOT NULL REFERENCES loads(load_id)`
- `month INTEGER NOT NULL`
- `energy_factor REAL NOT NULL DEFAULT 1.0`
- `notes TEXT`

Rules:

- one row per load per month

### `generators`

Purpose:

- store backup or supplemental generator configuration

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `generator_id TEXT UNIQUE NOT NULL`
- `name TEXT NOT NULL`
- `nominal_power_w REAL NOT NULL`
- `surge_power_w REAL`
- `fuel_type TEXT`
- `notes TEXT`

### `generator_monthly_profiles`

Purpose:

- store month-by-month generator availability assumptions

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `generator_id TEXT NOT NULL REFERENCES generators(generator_id)`
- `month INTEGER NOT NULL`
- `availability_factor REAL NOT NULL DEFAULT 1.0`
- `notes TEXT`

### `solar_monthly_profiles`

Purpose:

- store month-by-month solar availability or yield assumptions per surface or array

Suggested columns:

- `id INTEGER PRIMARY KEY AUTOINCREMENT`
- `surface_id TEXT REFERENCES surfaces(surface_id)`
- `array_id TEXT REFERENCES pv_arrays(array_id)`
- `month INTEGER NOT NULL`
- `solar_factor REAL NOT NULL DEFAULT 1.0`
- `notes TEXT`

Recommendation:

- start with `surface_id`
- only move to `array_id` if split-per-surface becomes necessary

## Tables not recommended yet

Do not add database tables yet for:

- relationship evaluation results
- `electrical_status`
- `fit_status`
- clipping warnings
- wiring recommendations
- fuse recommendations
- monthly balance results

These are calculation outputs and should stay derived until the model stabilizes.

## Recommended first migration slice

To keep scope manageable, the first useful database extension should only add:

- `pv_strings`
- `pv_arrays`
- `array_strings`
- `mppt_configurations`
- `array_mppts`
- `battery_banks`
- `mppt_battery_banks`

This first slice is enough to model:

- surface -> string -> array -> MPPT -> battery bank

That gives the digital twin a meaningful electrical backbone before adding AC-side distribution.

## Second migration slice

After the first slice works, add:

- `inverter_configurations`
- `battery_bank_inverters`
- `load_circuits`
- `loads`
- `load_monthly_profiles`

This adds the downstream AC side.

## Third migration slice

Add later if needed:

- `generators`
- `generator_monthly_profiles`
- `solar_monthly_profiles`

This adds stronger scenario modeling.

## Export strategy

The JSON export should assemble:

- persisted entities from SQLite
- derived relationship evaluations from calculation code
- monthly summaries from simulation logic

So the DB should store topology and assumptions, while the export should provide:

- `electrical_status`
- `fit_status`
- `reasons`
- derived voltages, currents, power
- monthly surplus and deficit

## Recommendation

The next implementation step should be a schema proposal for the first migration slice only.

Do not implement the full digital twin schema in one jump.
Start with the PV side and battery-bank linkage first.
