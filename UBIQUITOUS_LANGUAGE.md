## OffGridOS Ubiquitous Language

This is the canonical source for all domain terminology in this repository.
Every concept must be referred to by its canonical name across the database schema, TypeScript interfaces, CLI prompts, validation messages, UI labels, and documentation.

## Core concepts

| Domain concept | DB table (plural snake_case) | TS interface (singular PascalCase) | Preferred label |
|---|---|---|---|
| Location | `locations` | `Location` | Location |
| Surface | `surfaces` | `Surface` | Surface |
| Panel type | `panel_types` | `PanelType` | Panel type |
| Surface panel assignment | `surface_panel_assignments` | `SurfacePanelAssignment` | Panel count |
| PV array | `pv_arrays` | `PvArray` | Array |
| PV string | `pv_strings` | `PvString` | String |
| Array-to-MPPT mapping | `array_to_mppt_mappings` | `ArrayToMpptMapping` | Array-to-MPPT mapping |
| MPPT type | `mppt_types` | `MpptType` | MPPT |
| Battery type | `battery_types` | `BatteryType` | Battery |
| Inverter type | `inverter_types` | `InverterType` | Inverter |
| Cabinet type | `cabinet_types` | `CabinetType` | Cabinet type |
| DC busbar | `dc_busbars` | `DcBusbar` | DC busbar |
| Conversion device | `conversion_devices` | `ConversionDevice` | Conversion device |
| Project preference | `project_preferences` | `ProjectPreferences` | Preference |
| Victron CAN | `battery_types.victron_can` | `BatteryType.victron_can` | Victron CAN |

## Project configuration concepts

Use `configuration` for project-selected or project-configured records when you need a shared naming pattern across the domain.

| Domain concept | DB table (plural snake_case) | TS interface (singular PascalCase) | Preferred label |
|---|---|---|---|
| Surface configuration | `surface_configurations` | `SurfaceConfiguration` | Surface configuration |
| Battery bank configuration | `battery_bank_configurations` | `BatteryBankConfiguration` | Battery bank configuration |
| MPPT configuration | `mppt_configurations` | `MpptConfiguration` | MPPT configuration |
| Inverter configuration | `inverter_configurations` | `InverterConfiguration` | Inverter configuration |

## Legacy terminology

The following older terms are legacy implementation names and are not canonical going forward:

- `roof_face` -> use `surface`
- `roof_faces` -> use `surfaces`
- `RoofFace` -> use `Surface`
- `roof_face_configuration` -> use `surface_configuration`
- `roof_panels` -> use `surface_panel_assignments`
- `arrays` -> use `pv_arrays`
- `strings` -> use `pv_strings`
- `preferences` -> use `project_preferences`

## Output-only concepts

| Domain concept | TS interface | Used in |
|---|---|---|
| Project input | `ProjectInput` | Aggregated input passed to calculations |
| Yield estimate | `YieldEstimate` | Monthly kWh per surface |
| String suggestion | `StringSuggestion` | Suggested string layout per surface |
| MPPT suggestion | `MpptSuggestion` | Suggested MPPT configuration and fit evaluation |
| Battery recommendation | `BatteryRecommendation` | Capacity and unit-count recommendation |
| Cable suggestion | `CableSuggestion` | Minimum cross-section per string |
| Validation message | `ValidationMessage` | Validation and feedback output |
| Project result | `ProjectResult` | Combined output object |

## PV topology

Use the following terms consistently in the digital twin and future schema work.

| Domain concept | Meaning | Preferred label |
|---|---|---|
| Module | One photovoltaic panel | Panel |
| String | A series-connected set of panels | String |
| Parallel strings | Two or more strings connected in parallel | Parallel strings |
| String array | Set of series and or parallel strings | String array |
| Array | The complete PV grouping connected to one MPPT input, regardless of whether it contains one string, parallel strings, or another allowed combination | Array |
| PV system array | The larger photovoltaic assembly made of one or more arrays | PV array |
| MPPT solar charger | Solar charger that tracks maximum power point and charges the battery bank | MPPT |
| Battery bank | The connected battery system | Battery bank |
| Inverter/charger | Combined inverter and charger such as a MultiPlus or Quattro | Inverter/charger |
| Load circuit | A group of loads protected by one final fuse or breaker downstream of a conversion device | Load circuit |
| Load | An electrical load item connected to a load circuit, which may be one appliance, one endpoint, or one modeled load group | Load |
| Generator | AC source used as backup or supplemental charging supply | Generator |
| MPPT input fit | The quality of match between a selected array and a selected MPPT on the PV input side | MPPT input fit |
| Electrical status | Whether a relationship between two connected components stays within hard limits | Electrical status |
| Fit status | The quality of match between two connected components when the connection is within hard limits | Fit status |

## Series and parallel examples

- Two `35 V`, `10 A` panels in series form one `string` of about `70 V`, `10 A`.
- Two `35 V`, `10 A` panels in parallel are not a string; this is a `parallel module group` of about `35 V`, `20 A`.
- Two strings of two `35 V`, `10 A` panels in series, connected in parallel, form `parallel strings` of about `70 V`, `20 A`.

## Current configuration assumptions

- A surface may feed one or more arrays.
- Each array feeds exactly one MPPT.
- In this project's current setup, each surface maps `1:1` to one array and one MPPT.

## Relationship evaluation

Every important connection between two components should be evaluated in two layers:

1. `electrical_status`
2. `fit_status`

Use this pattern for relationships such as:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`
- `inverter -> load circuit`
- `load circuit -> load`

### Electrical status

`electrical_status` answers the hard-limit question:

- `within_limits`
- `outside_limits`

Use `outside_limits` when the relationship violates a hard electrical boundary such as voltage, current, startup range, or another non-negotiable compatibility limit.

### Fit status

`fit_status` answers the configuration-quality question when the relationship is within hard limits:

- `optimal`
- `fully_utilized`
- `clipping_expected`
- `underutilized`

This allows the model to distinguish:

- unsafe or impossible configurations
- safe but imperfect configurations
- near-full utilization that still stays within limits
- intentional seasonal trade-offs such as summer clipping for better winter performance

Use `fully_utilized` for cases where the array uses roughly 95% to 100% of the available MPPT PV power.
Use `optimal` for the middle band where the array uses roughly 80% to 95% of the available MPPT PV power.
Use `underutilized` when the array uses less than roughly 80% of the available MPPT PV power.

## Orientation

Surface orientation is stored as an azimuth in degrees from `0` to `360`:

| Direction | Azimuth |
|---|---|
| North | `0` |
| East | `90` |
| South | `180` |
| West | `270` |

Any intermediate value is valid, such as `140` for a south-southeast-facing roof.
For flat roofs with `tilt_deg = 0`, orientation has no effect on yield and any value may be used.
The field is named `orientation_deg` in both the DB column and the TypeScript model.

## Rules

- DB tables use plural snake_case.
- TypeScript interfaces use singular PascalCase.
- CLI prompts, UI labels, and output text should match the canonical domain concept name.
- Use `*_types` for catalog tables.
- Use `*_configurations` for project-selected or project-configured records when the noun needs to cover the whole selected setup.
- Use `surface configuration` language for the selected per-surface PV setup, including panel choice, count, string layout, and MPPT choice.
- Use `battery_bank_configuration` language for the selected battery-bank setup.
- Use `mppt_configuration` language for the selected MPPT setup.
- Use `inverter_configuration` language for the selected inverter setup.
- Use `row-synced wrapping` for config rows where wrapped labels should keep adjacent fields aligned.
- Use `surface` instead of `roof face` in domain language, UI labels, code names, and schema names.
- Use `array` for the persisted PV grouping connected to one surface and one MPPT input.
- Use `string` only for series-connected panels.
- Use `array_to_mppt_mapping` language for the persisted array-to-MPPT selection row.
- Use `MPPT input fit` to describe whether a selected array is a good or poor match for a selected MPPT.
- Use `load circuit` for the protected electrical group above the load level.
- Use `load` for the electrical load item you want to reason about in the model.
- Use `DC busbar` for the shared DC distribution point between the battery bank and downstream branches.
- Use `output_voltage_v` for the output voltage of a conversion device.
- Evaluate component relationships with both `electrical_status` and `fit_status` when the distinction matters.
- Do not introduce near-synonyms for core concepts without a deliberate reason.
- If a concept is added, renamed, or removed, update this file in the same change.
