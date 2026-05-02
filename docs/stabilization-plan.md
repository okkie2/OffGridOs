# Stabilization Plan

This note turns the current table-scope matrix into a practical refactor order.
It is intended to reduce drift before further feature work lands.

## Goals

- make ownership explicit in the schema
- reduce hidden inheritance between parent and child rows
- keep naming consistent with the ubiquitous language
- avoid compatibility fallbacks unless they are temporary migration helpers

## Ordering

Work from easiest and least risky to hardest:

### 1. Global catalog tables

These already behave like reusable definitions and usually do not need `location_id`.

- `panel_types`
- `mppt_types`
- `battery_types`
- `inverter_types`
- `converter_types`
- `cabinet_types`

Typical work:

- keep them project-global if they are already stable
- rename their primary keys to the table-derived pattern when touched
- keep foreign keys aligned with the referenced identifier name

### 2. Project-wide tables

These belong to the project but not to one specific location.

- `project_preferences`
- `inverter_configurations` if it remains project-wide

Typical work:

- keep `project_id`
- use `location_id = null` only if the row truly represents project-wide state
- add `created_at` and `updated_at` when the row is mutable and lifecycle history matters

### 3. Location-owned configuration tables

These are the first high-value candidates for explicit `location_id`.

- `surfaces`
- `surface_panel_assignments`
- `pv_arrays`
- `pv_strings`
- `array_to_mppt_mappings`
- `surface_configurations`
- `battery_bank_configurations`
- `converters`
- `load_circuits`
- `loads`

Typical work:

- make `location_id` explicit on the row
- stop inferring location from parent rows where possible
- rename any remaining bare `id` columns to table-derived identifiers
- align foreign keys with the new identifier names

### 4. Boundary tables

These are special and should be touched only when the rule is clearly beneficial.

- `projects`
- `locations`

Typical work:

- keep them readable and boundary-focused
- do not force extra scope fields onto them if that makes the meaning worse

## Recommended Migration Wave

If we want a low-risk implementation order, use this sequence:

1. `converters`
2. `load_circuits`
3. `loads`
4. `surfaces`
5. `surface_panel_assignments`
6. `pv_arrays`
7. `pv_strings`
8. `array_to_mppt_mappings`
9. `surface_configurations`
10. `battery_bank_configurations`

This order keeps the currently user-visible workbench hierarchy consistent first, then moves outward to PV-side tables.

## Guardrails

- Do not add fallbacks as a permanent solution.
- When a fallback appears, treat it as a signal that the schema or API should be refactored.
- When a table changes, update the docs, types, and tests in the same change if practical.
- Keep the rule that table identifiers should normally carry the table name.

## Exit Condition

The migration wave is complete when:

- the chosen tables carry explicit scope columns where intended
- IDs and foreign keys match the table naming rule
- docs and types reflect the final shape
- the UI no longer depends on hidden inherited ownership for those tables
