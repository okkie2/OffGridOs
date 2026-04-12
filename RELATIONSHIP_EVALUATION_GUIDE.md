# Relationship Evaluation Guide

This note defines how relationship evaluation should be expressed across the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

Every important relationship in the model should be evaluated consistently.

This applies to:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`
- `inverter -> branch circuit`
- `branch circuit -> consumer`

The evaluation model should support:

- hard electrical boundaries
- softer design trade-offs
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
- `acceptable`
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
- `winter_biased_design`
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
- `continuous_current_too_high`
- `peak_current_too_high`
- `surge_demand_too_high`

Soft-fit reasons:

- `high_current_draw`
- `oversized_inverter`
- `well_matched`

### Inverter to branch circuit

Hard-limit reasons:

- `branch_voltage_mismatch`
- `branch_current_too_high`
- `branch_power_too_high`

Soft-fit reasons:

- `branch_near_capacity`
- `branch_underutilized`
- `well_matched`

### Branch circuit to consumer

Hard-limit reasons:

- `consumer_voltage_mismatch`
- `consumer_running_power_too_high`
- `consumer_surge_power_too_high`

Soft-fit reasons:

- `consumer_high_startup_load`
- `consumer_low_duty_cycle`
- `well_matched`

## Seasonal interpretation

Some reasons should explicitly allow seasonal trade-offs.

For example:

- `summer_clipping_expected`
- `winter_biased_design`

These should not force `outside_limits`.
They belong under `within_limits` with a fit status such as `clipping_expected` or `acceptable`.

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
3. designing UI badges, warnings, and tooltips

Do not store all `reasons` in SQLite initially unless they become part of an audited or user-edited workflow.

