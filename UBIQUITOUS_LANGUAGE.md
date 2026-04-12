# OffGridOS Ubiquitous Language

This is the canonical source for all domain terminology in this repository.
Every concept must be referred to by its canonical name across the database schema, TypeScript interfaces, CLI prompts, validation messages, UI labels, and documentation.

## Core concepts

| Domain concept | DB table (plural snake_case) | TS interface (singular PascalCase) | Preferred label |
|---|---|---|---|
| Location | `location` | `Location` | Location |
| Roof face | `roof_faces` | `RoofFace` | Roof face |
| Panel type | `panel_types` | `PanelType` | Panel type |
| Roof panel assignment | `roof_panels` | `RoofPanelAssignment` | Panel count |
| MPPT type | `mppt_types` | `MpptType` | MPPT |
| Battery type | `battery_types` | `BatteryType` | Battery |
| Inverter | `inverters` | `Inverter` | Inverter |
| Preference | `preferences` | `Preferences` | Preference |
| Victron CAN | `battery_types.victron_can` | `BatteryType.victron_can` | Victron CAN |

## Output-only concepts

| Domain concept | TS interface | Used in |
|---|---|---|
| Project input | `ProjectInput` | Aggregated input passed to calculations |
| Yield estimate | `YieldEstimate` | Monthly kWh per roof face |
| String suggestion | `StringSuggestion` | Suggested string layout per roof face |
| MPPT suggestion | `MpptSuggestion` | Suggested MPPT selection and fit evaluation |
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
| Array | The complete PV grouping connected to one MPPT input, regardless of whether it contains one string, parallel strings, or another allowed combination | Array |
| PV system array | The larger photovoltaic assembly made of one or more arrays | PV array |
| MPPT solar charger | Solar charger that tracks maximum power point and charges the battery bank | MPPT |
| Battery bank | The connected battery system | Battery bank |
| Inverter/charger | Combined inverter and charger such as a MultiPlus or Quattro | Inverter/charger |
| Branch circuit | A group of consumers protected by one final fuse or breaker downstream of an inverter or other source | Branch circuit |
| Consumer | An electrical load item connected to a branch circuit, which may be one appliance, one endpoint, or one modeled load group | Consumer |
| Generator | AC source used as backup or supplemental charging supply | Generator |
| MPPT input fit | The quality of match between a selected array and a selected MPPT on the PV input side | MPPT input fit |
| Electrical status | Whether a relationship between two connected components stays within hard limits | Electrical status |
| Fit status | The quality of match between two connected components when the connection is within hard limits | Fit status |

## Series and parallel examples

- Two `35 V`, `10 A` panels in series form one `string` of about `70 V`, `10 A`.
- Two `35 V`, `10 A` panels in parallel are not a string; this is a `parallel module group` of about `35 V`, `20 A`.
- Two strings of two `35 V`, `10 A` panels in series, connected in parallel, form `parallel strings` of about `70 V`, `20 A`.

## Current design assumptions

- A roof face may feed one or more arrays.
- Each array feeds exactly one MPPT.
- In this project's current setup, each roof face maps `1:1` to one array and one MPPT.

## Relationship evaluation

Every important connection between two components should be evaluated in two layers:

1. `electrical_status`
2. `fit_status`

Use this pattern for relationships such as:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`
- `inverter -> branch circuit`
- `branch circuit -> consumer`

### Electrical status

`electrical_status` answers the hard-limit question:

- `within_limits`
- `outside_limits`

Use `outside_limits` when the relationship violates a hard electrical boundary such as voltage, current, startup range, or another non-negotiable compatibility limit.

### Fit status

`fit_status` answers the design-quality question when the relationship is within hard limits:

- `optimal`
- `acceptable`
- `clipping_expected`
- `underutilized`

This allows the model to distinguish:

- unsafe or impossible configurations
- safe but imperfect configurations
- intentional seasonal trade-offs such as summer clipping for better winter performance

## Orientation

Roof face orientation is stored as an azimuth in degrees from `0` to `360`:

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
- Use `string` only for series-connected panels.
- Use `array` for the full PV grouping connected to one MPPT input.
- Use `MPPT input fit` to describe whether a selected array is a good or poor match for a selected MPPT.
- Evaluate component relationships with both `electrical_status` and `fit_status` when the distinction matters.
- Do not introduce near-synonyms for core concepts without a deliberate reason.
- If a concept is added, renamed, or removed, update this file in the same change.
