# Verdict Language Guide

This note defines how OffGridOS should explain relationship verdicts in human-readable language.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

Use this guide together with [relationship-evaluation-guide.md](./relationship-evaluation-guide.md):

- [relationship-evaluation-guide.md](./relationship-evaluation-guide.md) defines the evaluation shape, statuses, and reason codes
- this guide defines how those results should be phrased in the UI

## Purpose

OffGridOS verdicts should not stop at a class label such as:

- `Optimal`
- `Fully utilized`
- `Underutilized`
- `Outside limits`

They should also explain:

1. what relationship is being judged
2. which side is constrained or underused
3. why the verdict was reached

## Core pattern

Present relationship verdicts in this order:

1. status line
2. relationship line
3. explanation line

Example:

- `Within limits · Underutilized`
- `Array -> MPPT`
- `The selected MPPT has significant unused PV capacity relative to this array.`

## Language rule

When the verdict is not `outside_limits`, the explanation should still name the subject of the verdict.

Do not say only:

- `Underutilized`
- `Fully utilized`
- `Optimal`

Instead say:

- what is underutilized by what
- what is a fully utilized match for what
- what is closely matched to what

## Canonical sentence pattern

Use these sentence shapes:

- `Outside limits`: `{Left side} is not electrically compatible with {right side}.`
- `Optimal`: `{Left side} is closely matched to {right side}.`
- `Fully utilized`: `{Left side} is a well-utilized match for {right side}, with capacity meaningfully in use.`
- `Clipping expected`: `{Left side} is intentionally large relative to {right side}, so clipping is expected in stronger conditions.`
- `Underutilized`: `{Right side} has significant unused capacity relative to {left side}.`

This keeps the wording aligned with relationship direction while still naming the component with spare capacity.

## Relationship-specific templates

### Array -> MPPT

- `Optimal`: `This array is closely matched to the selected MPPT.`
- `Fully utilized`: `This array is a well-utilized match for the selected MPPT, with capacity meaningfully in use.`
- `Clipping expected`: `This array is intentionally large relative to the selected MPPT, so clipping is expected in stronger conditions.`
- `Underutilized`: `The selected MPPT has significant unused PV capacity relative to this array.`
- `Outside limits`: `This array is not electrically compatible with the selected MPPT.`

Reason-level wording:

- `voltage_too_high`: `String voltage exceeds the MPPT voltage limit.`
- `startup_voltage_too_low`: `String voltage is too low for reliable MPPT startup.`
- `input_current_too_high`: `Array input current exceeds the MPPT input-current limit.`
- `low_utilization`: `The array uses only a small share of the MPPT's available PV capacity.`
- `well_matched`: `Array power and MPPT capacity are aligned.`

### MPPT -> battery bank

- `Optimal`: `The selected MPPT is closely matched to this battery bank.`
- `Fully utilized`: `The selected MPPT charges this battery bank appropriately, with capacity meaningfully in use.`
- `Underutilized`: `The battery charge path is underutilized relative to the selected MPPT.`
- `Outside limits`: `The selected MPPT is not electrically compatible with this battery bank.`

Reason-level wording:

- `battery_voltage_mismatch`: `The MPPT battery voltage does not match the battery bank voltage.`
- `charge_current_too_high`: `The MPPT can deliver too much charge current for this battery bank.`
- `battery_charge_path_underutilized`: `The available MPPT charging capability is more than this battery bank meaningfully uses.`
- `well_matched`: `MPPT charging capability and battery-bank acceptance are aligned.`

### Battery bank -> inverter

- `Optimal`: `This battery bank is closely matched to the selected inverter.`
- `Fully utilized`: `This battery bank supports the selected inverter with capacity meaningfully in use.`
- `Underutilized`: `The selected inverter has significant unused capacity relative to this battery bank.`
- `Outside limits`: `This battery bank is not electrically compatible with the selected inverter.`

Reason-level wording:

- `dc_voltage_mismatch`: `Battery-bank voltage does not match the inverter DC input range.`
- `inverter_current_too_high_for_battery`: `The inverter can draw more current than this battery bank should supply.`
- `inverter_power_too_high_for_battery`: `The inverter is too large for this battery bank's available power.`
- `inverter_underutilized`: `The selected inverter is larger than this battery bank currently justifies.`
- `well_matched`: `Battery-bank voltage and power capability are aligned with the inverter.`

### Inverter -> load circuit

- `Optimal`: `This load circuit is closely matched to the inverter.`
- `Fully utilized`: `This load circuit uses the inverter's output capacity well.`
- `Underutilized`: `The inverter has significant unused capacity relative to this load circuit.`
- `Outside limits`: `This load circuit is not electrically compatible with the inverter.`

### Load circuit -> load

- `Optimal`: `This load is closely matched to the load circuit.`
- `Fully utilized`: `This load runs on this load circuit with circuit capacity meaningfully in use.`
- `Underutilized`: `This load circuit has significant unused capacity relative to this load.`
- `Outside limits`: `This load is not electrically compatible with this load circuit.`

## UI guidance

The badge can stay short:

- `Optimal`
- `Fully utilized`
- `Underutilized`
- `Clipping expected`
- `Outside limits`

But the line below the badge should explain the verdict with a full sentence derived from:

1. relationship type
2. `electrical_status`
3. `fit_status`
4. `reasons`

## Recommendation

Use this guide when:

1. writing verdict copy in React components
2. turning reason codes into explanation strings
3. reviewing whether a verdict actually says what is being underused, oversized, or blocked

If a verdict sentence does not answer `what relative to what?`, it is too vague.
