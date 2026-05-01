# Database

## Overview

OffGridOS uses a single-project SQLite database for both persisted project inputs and catalog data. The schema is intentionally compact, with the PV topology, battery-bank configuration, inverter configuration, the shared DC busbar, and the new load-side model each stored as explicit rows.

## Core Tables

- `locations`: shared site metadata for the project
- `surfaces`: roof or mounting surfaces
- `panel_types`: reusable PV panel catalog entries
- `pv_arrays` and `pv_strings`: persisted PV topology for each surface
- `mppt_types` and `mppt_configurations`: MPPT catalog and selected MPPT setup
- `battery_types` and `battery_bank_configurations`: battery catalog and selected battery-bank setup
- `inverter_types` and `inverter_configurations`: legacy inverter catalog and selected inverter setup
- `dc_busbars`: shared DC distribution points between the battery bank and downstream branches
- `conversion_devices`, `project_converters`, `load_circuits`, and `loads`: the load-side model for downstream electrical demand

## Load-Side Model

- `conversion_devices` unifies inverter-like and converter-like devices behind one catalog table and now mirrors the inverter catalog bridge
- each `conversion_device` includes an explicit `output_voltage_v` field for the device output domain
- `project_converters` stores the project-level converter instances shown on `Consumption`; each row has its own title and description and references one catalog `conversion_device`
- `dc_busbars` stores the shared DC distribution point for the battery-bank side of the system
- `battery_bank_configurations.selected_dc_busbar_id` and `inverter_configurations.selected_dc_busbar_id` optionally link those configurations to one shared busbar
- `load_circuits` groups one or more loads behind one protected distribution point and links to the owning `project_converter`
- `loads` stores the individual electrical loads and their usage profile inputs

## Notes

- `load_circuits` and `loads` are the current canonical replacements for the older downstream distribution wording.
- Derived totals, load-circuit sizing, and fuse suggestions remain calculation outputs rather than persisted summary columns.
- The detailed table/relationship diagram is maintained in [database-schema.md](./database-schema.md).
