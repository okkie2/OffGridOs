# OffGridOS — Ubiquitous Language Glossary

This is the canonical source for all domain terminology.
Every concept must be referred to by its canonical name across the database schema, TypeScript interfaces, CLI prompts, and output labels — no synonyms.

| Domain concept | DB table (plural snake_case) | TS interface (singular PascalCase) | CLI label |
|---|---|---|---|
| Location | `location` | `Location` | Location |
| Roof face | `roof_faces` | `RoofFace` | Face |
| Panel type | `panel_types` | `PanelType` | Panel type |
| Roof panel assignment | `roof_panels` | `RoofPanelAssignment` | Panel count |
| MPPT type | `mppt_types` | `MpptType` | MPPT |
| Battery type | `battery_types` | `BatteryType` | Battery |
| Victron CAN | `battery_types.victron_can` | `BatteryType.victron_can` | Victron CAN |
| Preference | `preferences` | `Preferences` | Preferences |

## Output-only domain objects (no DB table)

| Domain concept | TS interface | Used in |
|---|---|---|
| Project input | `ProjectInput` | Aggregated input passed to calculations |
| Yield estimate | `YieldEstimate` | Monthly kWh per roof face |
| String suggestion | `StringSuggestion` | Series/parallel panel config per roof face |
| MPPT suggestion | `MpptSuggestion` | Controller selection and count |
| Battery recommendation | `BatteryRecommendation` | Capacity, unit count, series/parallel config |
| Cable suggestion | `CableSuggestion` | Minimum cross-section mm² per string |
| Validation message | `ValidationMessage` | `{ level: 'error' | 'warning' | 'info', message: string }` |
| Project result | `ProjectResult` | All output combined |

## Orientation

Roof face orientation is stored as an **azimuth in degrees (0–360)**:

| Direction | Azimuth |
|---|---|
| North | 0° |
| East | 90° |
| South | 180° |
| West | 270° |

Any intermediate value is valid (e.g. 140° for a south-southeast-facing roof).
For flat roofs (tilt = 0°), orientation has no effect on yield and any value may be used.
The field is named `orientation_deg` in the DB column and TS interface.

## Rules

- **DB tables:** plural snake_case
- **TS interfaces:** singular PascalCase
- **CLI prompts and output labels:** human-readable, match the domain concept name exactly
- Do not use synonyms — e.g. never call a *roof face* a "roof surface", "panel area", or "face"
- Do not call an *MPPT type* an "MPPT controller" in code — only in CLI labels
- If a concept is added, update this glossary in the same change
