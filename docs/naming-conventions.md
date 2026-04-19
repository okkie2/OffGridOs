# Naming Conventions

This note describes the target naming pattern for OffGridOS so catalog tables, project-selected records, and derived outputs stay consistent.

## Goal

Use one naming rule across the domain:

- catalog tables use `*_types`
- project-selected or project-configured records use `*_configurations`
- derived results use `*_output`, `*_profiles`, `*_states`, or similar result-oriented names

## Catalog tables

These hold reusable product definitions:

- `panel_types`
- `mppt_types`
- `battery_types`
- `inverter_types`

## Project configuration tables

These hold the selected or configured items for one project:

- `roof_face_configurations`
- `battery_bank_configurations`
- `mppt_configurations`
- `inverter_configurations`

## Preferred terminology

Use these terms consistently in UI labels, docs, and future schema work:

- roof face configuration
- battery bank configuration
- MPPT configuration
- inverter configuration

Keep `roof face`, `battery bank`, `MPPT`, and `inverter` as the entity nouns. Use `configuration` when the row represents the chosen project-specific setup.
