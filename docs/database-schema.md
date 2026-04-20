# Database Schema

This document shows the current SQLite schema for OffGridOS as a Mermaid entity-relationship diagram.

The database is currently organized as a single-project workspace, not as a multi-tenant schema.

```mermaid
erDiagram
    LOCATION {
        INTEGER id PK
        TEXT country
        TEXT place_name
        REAL latitude
        REAL longitude
        REAL northing
        REAL easting
    }

    ROOF_FACES {
        INTEGER id PK
        TEXT roof_face_id UK
        TEXT name
        REAL orientation_deg
        REAL tilt_deg
        REAL usable_area_m2
        TEXT notes
    }

    PANEL_TYPES {
        INTEGER id PK
        TEXT panel_type_id UK
        TEXT model
        REAL wp
        REAL voc
        REAL vmp
        REAL isc
        REAL imp
        REAL length_mm
        REAL width_mm
        TEXT notes
        REAL price
    }

    ROOF_PANELS {
        INTEGER id PK
        TEXT roof_face_id FK
        TEXT panel_type_id FK
        INTEGER count
    }

    ARRAYS {
        INTEGER id PK
        TEXT array_id UK
        TEXT roof_face_id UK, FK
        TEXT name
        TEXT panel_type_id FK
        INTEGER panel_count
        INTEGER panels_per_string
        INTEGER parallel_strings
        REAL installed_wp
        TEXT notes
    }

    STRINGS {
        INTEGER id PK
        TEXT string_id UK
        TEXT array_id FK
        TEXT roof_face_id FK
        INTEGER string_index
        TEXT panel_type_id FK
        INTEGER panel_count
    }

    ARRAY_TO_MPPT_MAPPINGS {
        INTEGER id PK
        TEXT mapping_id UK
        TEXT array_id UK, FK
        TEXT selected_mppt_type_id FK
    }

    ROOF_FACE_CONFIGURATIONS {
        INTEGER id PK
        TEXT roof_face_id UK, FK
        INTEGER panels_per_string
        INTEGER parallel_strings
        TEXT selected_mppt_type_id FK
    }

    MPPT_TYPES {
        INTEGER id PK
        TEXT mppt_type_id UK
        TEXT model
        INTEGER tracker_count
        REAL max_voc
        REAL max_pv_power
        REAL max_pv_input_current_a
        REAL max_pv_short_circuit_current_a
        REAL max_charge_current
        REAL nominal_battery_voltage
        TEXT notes
    }

    BATTERY_TYPES {
        INTEGER id PK
        TEXT battery_type_id UK
        TEXT model
        TEXT chemistry
        REAL nominal_voltage
        REAL capacity_ah
        REAL capacity_kwh
        INTEGER victron_can
        TEXT cooling
        REAL price
        REAL price_per_kwh
        TEXT source
        TEXT url
        TEXT notes
    }

    BATTERY_BANK_CONFIGURATIONS {
        INTEGER id PK
        TEXT battery_bank_id UK
        TEXT selected_battery_type_id FK
        INTEGER configured_battery_count
        INTEGER batteries_per_string
        INTEGER parallel_strings
    }

    INVERTER_TYPES {
        INTEGER id PK
        TEXT inverter_id UK
        TEXT model
        REAL input_voltage_v
        REAL output_voltage_v
        REAL continuous_power_w
        REAL peak_power_va
        REAL max_charge_current_a
        REAL efficiency_pct
        REAL price
        TEXT notes
    }

    INVERTER_CONFIGURATIONS {
        INTEGER id PK
        TEXT inverter_configuration_id UK
        TEXT selected_inverter_type_id FK
    }

    PREFERENCES {
        INTEGER id PK
        TEXT key UK
        TEXT value
    }

    LOCATION ||--o| PREFERENCES : "shared project context"
    ROOF_FACES ||--o{ ROOF_PANELS : "has"
    PANEL_TYPES ||--o{ ROOF_PANELS : "used by"
    ROOF_FACES ||--o| ARRAYS : "has"
    ARRAYS ||--o{ STRINGS : "has"
    ARRAYS ||--o| ARRAY_TO_MPPT_MAPPINGS : "selected for"
    ROOF_FACES ||--o| ROOF_FACE_CONFIGURATIONS : "has"
    MPPT_TYPES ||--o{ ROOF_FACE_CONFIGURATIONS : "selected for"
    BATTERY_TYPES ||--o{ BATTERY_BANK_CONFIGURATIONS : "selected for"
    INVERTER_TYPES ||--o{ INVERTER_CONFIGURATIONS : "selected for"
```

## Notes

- `location` holds the shared project site coordinates.
- `roof_faces` defines the roof geometry that the current project uses.
- `roof_panels` stores the current panel assignment per roof face.
- `arrays`, `strings`, and `array_to_mppt_mappings` persist the current PV topology layer and stay synchronized with the roof-face configuration.
- `roof_face_configurations` stores per-face string layout and MPPT choice.
- `battery_bank_configurations` stores the current battery-bank sizing choice.
- `mppt_types`, `battery_types`, and `inverter_types` are catalog tables.
- `inverter_configurations` stores the selected inverter setup.
- `preferences` currently stores the remaining project preferences.
- monthly solar output by roof face is currently derived at export time rather than stored as a base table.
- the project-level monthly solar total is the sum of those derived roof-face monthly outputs.

The schema is intentionally small and still aimed at one project at a time. If OffGridOS later grows into a multi-user or multi-project tool, this doc should be updated alongside the schema.
