# JSON Export Shape

This note defines the first detailed JSON export contract for the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The export should be stable enough for the React app to consume without needing to understand SQLite internals.

It should:

- expose persisted project structure
- expose derived electrical and seasonal results
- keep relationships explicit
- stay readable in raw JSON

## Top-level shape

```json
{
  "project": {},
  "entities": {},
  "relationships": {},
  "derived": {},
  "meta": {}
}
```

## `project`

High-level project context.

Suggested fields:

- `project_id`
- `name`
- `location`
- `current_assumptions`
- `notes`

Example:

```json
{
  "project_id": "offgridos-project",
  "name": "OffGridOS Baseline",
  "location": {
    "country": "NL",
    "place_name": "Example",
    "latitude": 52.0,
    "longitude": 5.0
  },
  "current_assumptions": {
    "roof_face_to_array_default": "1:1",
    "array_to_mppt_default": "1:1"
  }
}
```

## `entities`

All persisted or canonical domain objects.

Suggested shape:

```json
{
  "roof_faces": [],
  "panel_types": [],
  "strings": [],
  "arrays": [],
  "mppt_types": [],
  "project_mppts": [],
  "battery_types": [],
  "battery_banks": [],
  "inverter_types": [],
  "project_inverters": [],
  "branch_circuits": [],
  "consumers": [],
  "generators": [],
  "consumer_monthly_profiles": [],
  "generator_monthly_profiles": [],
  "solar_monthly_profiles": []
}
```

## `relationships`

Explicit topology and evaluated chain connections.

Suggested shape:

```json
{
  "array_to_mppt": [],
  "mppt_to_battery_bank": [],
  "battery_bank_to_inverter": [],
  "inverter_to_branch_circuit": [],
  "branch_circuit_to_consumer": []
}
```

Each relationship object should include:

- source ID
- target ID
- key derived measurements
- `evaluation`

Example:

```json
{
  "relationship_id": "array-ne-1__mppt-ne-1",
  "from_array_id": "array-ne-1",
  "to_project_mppt_id": "mppt-ne-1",
  "input_voltage_v": 82.0,
  "input_current_a": 11.37,
  "input_power_w": 780.0,
  "evaluation": {
    "electrical_status": "within_limits",
    "fit_status": "acceptable",
    "reasons": ["winter_biased_design"]
  }
}
```

## `derived`

Calculated results that are useful to the frontend but do not need to be stored in SQLite first.

Suggested shape:

```json
{
  "string_states": [],
  "array_states": [],
  "battery_bank_states": [],
  "monthly_balance": [],
  "warnings": [],
  "summary": {}
}
```

### `string_states`

Suggested fields:

- `string_id`
- `voltage_v`
- `current_a`
- `power_wp`

### `array_states`

Suggested fields:

- `array_id`
- `voltage_v`
- `current_a`
- `power_wp`

### `battery_bank_states`

Suggested fields:

- `battery_bank_id`
- `nominal_voltage_v`
- `capacity_kwh`
- `usable_capacity_kwh`

### `monthly_balance`

One row per month.

Suggested fields:

- `month`
- `solar_kwh`
- `consumer_kwh`
- `generator_kwh`
- `battery_charge_kwh`
- `battery_discharge_kwh`
- `surplus_kwh`
- `deficit_kwh`
- `notes`

### `warnings`

Flat list of cross-system issues the frontend can surface quickly.

Suggested fields:

- `severity`
- `scope`
- `message`
- `related_ids`

### `summary`

Compact dashboard values.

Suggested fields:

- `total_installed_wp`
- `battery_capacity_kwh`
- `consumer_daily_energy_kwh`
- `worst_month`
- `best_month`
- `has_outside_limits`

## `meta`

Export metadata.

Suggested fields:

- `generated_at`
- `source_db_version`
- `export_version`
- `units`

Example:

```json
{
  "generated_at": "2026-04-12T12:00:00Z",
  "source_db_version": "project.db",
  "export_version": 1,
  "units": {
    "power": "W",
    "energy": "kWh",
    "voltage": "V",
    "current": "A"
  }
}
```

## Frontend assumptions

The React app should be able to assume:

- all entity IDs are stable strings
- relationships refer to entity IDs directly
- derived sections may grow over time without breaking the core entity model
- `electrical_status` and `fit_status` always live inside relationship `evaluation`

## First implementation recommendation

For the first exported version, prioritize:

1. `roof_faces`
2. `panel_types`
3. `arrays`
4. `project_mppts`
5. `battery_banks`
6. `array_to_mppt`
7. `mppt_to_battery_bank`
8. `monthly_balance`
9. `summary`

That is enough to drive the first useful frontend views.

