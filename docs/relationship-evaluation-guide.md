# Relationship Evaluation Guide

This note defines how relationship evaluation should be expressed across the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

Every important relationship in the model should be evaluated consistently.

This applies to:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`
- `inverter -> load circuit`
- `load circuit -> load`

The evaluation model should support:

- hard electrical boundaries
- softer configuration trade-offs
- explainable UI messages

## Evaluation shape

Each evaluated relationship should expose:

- `electrical_status`
- `fit_status`
- `reasons`
- derived measurement values

## Electrical status

Allowed values:

- `within_limits`
- `outside_limits`

Use `outside_limits` only for hard violations or incompatibilities.

## Fit status

Allowed values:

- `optimal`
- `fully_utilized`
- `clipping_expected`
- `underutilized`

Use `fit_status` only when the relationship is `within_limits`.

## Reason style

`reasons` should be machine-stable but human-readable enough to map cleanly into UI text.

Prefer short snake_case identifiers such as:

- `voltage_too_high`
- `current_too_high`
- `startup_voltage_too_low`
- `summer_clipping_expected`
- `low_utilization`

Do not use vague labels like:

- `bad`
- `poor_fit`
- `problem`

## Recommended reason set

### Array to MPPT

Hard-limit reasons:

- `voltage_too_high`
- `input_current_too_high`
- `startup_voltage_too_low`
- `mppt_voltage_window_mismatch`

Soft-fit reasons:

- `near_voltage_limit`
- `summer_clipping_expected`
- `winter_biased_configuration`
- `low_utilization`
- `well_matched`

### MPPT to battery bank

Hard-limit reasons:

- `battery_voltage_mismatch`
- `charge_current_too_high`
- `unsupported_battery_configuration`

Soft-fit reasons:

- `charge_current_limited`
- `battery_charge_path_underutilized`
- `well_matched`

### Battery bank to inverter

Hard-limit reasons:

- `dc_voltage_mismatch`
- `inverter_current_too_high_for_battery`
- `inverter_power_too_high_for_battery`

Soft-fit reasons:

- `inverter_underutilized`
- `well_matched`

### Inverter to load circuit

Hard-limit reasons:

- `load_circuit_voltage_mismatch`
- `load_circuit_current_too_high`
- `load_circuit_power_too_high`

Soft-fit reasons:

- `load_circuit_near_capacity`
- `load_circuit_underutilized`
- `well_matched`

### Load circuit to load

Hard-limit reasons:

- `load_voltage_mismatch`
- `load_running_power_too_high`
- `load_surge_power_too_high`

Soft-fit reasons:

- `load_high_startup_load`
- `load_low_duty_cycle`
- `well_matched`

## Seasonal interpretation

Some reasons should explicitly allow seasonal trade-offs.

For example:

- `summer_clipping_expected`
- `winter_biased_configuration`

These should not force `outside_limits`.
They belong under `within_limits` with a fit status such as `clipping_expected` or `fully_utilized`.

## UI guidance

The UI should present evaluation in this order:

1. `electrical_status`
2. `fit_status`
3. human-readable explanation derived from `reasons`

Examples:

- `Within limits · Optimal`
- `Within limits · Clipping expected`
- `Outside limits · Input voltage too high`

## Recommendation

Use this guide when:

1. defining calculator outputs
2. shaping JSON export
3. shaping UI badges, warnings, and tooltips

Do not store all `reasons` in SQLite initially unless they become part of an audited or user-edited workflow.

For the exact human-readable sentence patterns that explain `what relative to what`, also see [verdict-language-guide.md](./verdict-language-guide.md).
