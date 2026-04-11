# OffGridOS — CLI Solar Configuration Tool

You are an experienced TypeScript engineer.

Build a local CLI application in Node.js + TypeScript for modelling off-grid solar configurations.

## App identity

- **Name:** OffGridOS
- **CLI binary:** `ogos`
- **Data store:** SQLite (`project.db` in the working directory)
- **Commands:**
  - `ogos init` — creates a new `project.db` with the full schema
  - `ogos run` — reads the database, validates, calculates, prints results
- **Repo-local menu:** `./menu` launches an interactive menu from the project root (see CLI menu section)

---

## Design rule: INPUT vs OUTPUT

All input is entered by the user through the CLI menu using guided prompts (inquirer-style).
All output (calculations, suggestions, warnings) is printed to the terminal and written to `report.md`.
Never write results back into the database.

---

## Naming conventions

Before creating any table, read and follow the `ubiquitous-language` Codex skill (`~/.codex/skills/ubiquitous-language/SKILL.md`). Every domain concept must have one canonical name, used consistently across the database schema, TypeScript interfaces, CLI prompts, and output labels.

| Domain concept | DB table (plural snake_case) | TS interface (singular PascalCase) | CLI label |
|---|---|---|---|
| Location | `location` | `Location` | Location |
| Roof face | `roof_faces` | `RoofFace` | Roof face |
| Panel type | `panel_types` | `PanelType` | Panel type |
| Roof panel assignment | `roof_panels` | `RoofPanelAssignment` | Panels on roof |
| MPPT type | `mppt_types` | `MpptType` | MPPT controller |
| Battery type | `battery_types` | `BatteryType` | Battery type |
| Preference | `preferences` | `Preferences` | Preferences |

Rules:
- DB tables: plural snake_case
- TS interfaces: singular PascalCase
- CLI prompts and output labels: human-readable, match the domain concept name exactly
- Do not use synonyms (e.g. do not call a roof face a "roof surface" or "panel area" anywhere)

---

## CLI menu

Follow the `cli-entrypoint-conventions` skill:

- Provide `./menu` as a repo-local launcher (bash script, no global install needed)
- Directory-sensitive shell alias so `menu` works from the project root; document the setup
- The menu must expose real, working commands — not placeholders

### Menu structure

```
menu
 ├── Project
 │    └── Init new project (creates project.db)
 ├── Input
 │    ├── Location          (set / view)
 │    ├── Roof faces        (add / edit / delete / list)
 │    ├── Panel types       (add / edit / delete / list)
 │    ├── MPPT controllers  (add / edit / delete / list)
 │    ├── Battery types     (add / edit / delete / list)
 │    └── Preferences       (set / view)
 ├── Calculate
 │    └── Run calculations  (validate → calculate → print results)
 ├── Report
 │    └── View last report  (opens report.md in terminal)
 └── Quit
```

Each CRUD flow uses interactive prompts: field-by-field input with inline validation feedback.
Document the menu in `README.md`.

---

## Database schema

All data lives in `project.db` (SQLite). `ogos init` creates the file and all tables.

### location
One row only. Upsert on set.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER PRIMARY KEY | auto |
| country | TEXT NOT NULL | |
| place_name | TEXT NOT NULL | |
| latitude | REAL NOT NULL | -90 to 90 |
| longitude | REAL NOT NULL | -180 to 180 |

### roof_faces

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER PRIMARY KEY | auto |
| roof_face_id | TEXT UNIQUE NOT NULL | user-defined key |
| name | TEXT NOT NULL | |
| orientation | TEXT NOT NULL | N/NE/E/SE/S/SW/W/NW/FLAT |
| tilt_deg | REAL NOT NULL | 0–90 |
| usable_area_m2 | REAL NOT NULL | > 0 |
| notes | TEXT | |

### panel_types

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER PRIMARY KEY | auto |
| panel_type_id | TEXT UNIQUE NOT NULL | user-defined key |
| model | TEXT NOT NULL | |
| wp | REAL NOT NULL | Watt-peak |
| voc | REAL NOT NULL | Open-circuit voltage (V) |
| vmp | REAL NOT NULL | Max power voltage (V) |
| isc | REAL NOT NULL | Short-circuit current (A) |
| imp | REAL NOT NULL | Max power current (A) |
| length_mm | REAL NOT NULL | |
| width_mm | REAL NOT NULL | |
| notes | TEXT | |

### roof_panels

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER PRIMARY KEY | auto |
| roof_face_id | TEXT NOT NULL | FK → roof_faces.roof_face_id |
| panel_type_id | TEXT NOT NULL | FK → panel_types.panel_type_id |
| count | INTEGER NOT NULL | > 0 |

### mppt_types

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER PRIMARY KEY | auto |
| mppt_type_id | TEXT UNIQUE NOT NULL | user-defined key |
| model | TEXT NOT NULL | |
| max_voc | REAL NOT NULL | V |
| max_pv_power | REAL NOT NULL | W |
| max_charge_current | REAL NOT NULL | A |
| nominal_battery_voltage | REAL NOT NULL | V |
| notes | TEXT | |

### battery_types

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER PRIMARY KEY | auto |
| battery_type_id | TEXT UNIQUE NOT NULL | user-defined key |
| model | TEXT NOT NULL | |
| chemistry | TEXT NOT NULL | LiFePO4/Li-ion/AGM/GEL/FLA |
| nominal_voltage | REAL NOT NULL | V |
| capacity_ah | REAL NOT NULL | Ah |
| capacity_kwh | REAL NOT NULL | kWh |
| max_charge_rate | REAL | A (optional) |
| max_discharge_rate | REAL | A (optional) |
| victron_can | INTEGER NOT NULL DEFAULT 0 | 0/1 |
| cooling | TEXT NOT NULL DEFAULT 'passive' | active/passive |
| price | REAL | EUR |
| price_per_kwh | REAL | EUR/kWh |
| source | TEXT | source URL |
| url | TEXT | product URL |
| notes | TEXT | |

### preferences
Key-value store. Upsert on set.

| Column | Type |
|---|---|
| key | TEXT PRIMARY KEY |
| value | TEXT NOT NULL |

Supported keys:
- `target_battery_voltage` — system voltage: 12, 24, or 48
- `autonomy_days` — days of backup without sun (default: 2)
- `daily_consumption_kwh` — estimated daily usage
- `max_cable_length_m` — longest cable run from panels to MPPT
- `preferred_mppt_type_id` — references mppt_types (optional)
- `preferred_battery_type_id` — references battery_types (optional)

---

## Domain model

Define TypeScript interfaces matching the naming convention table above:

- `Location`
- `RoofFace`
- `PanelType`
- `RoofPanelAssignment`
- `MpptType`
- `BatteryType`
- `Preferences`
- `ProjectInput` — all parsed input combined
- `YieldEstimate` — per roof face, per month
- `StringSuggestion` — series/parallel config per roof face
- `MpptSuggestion` — which MPPT controller, how many
- `BatteryRecommendation` — min/max capacity, unit count, series/parallel config
- `CableSuggestion` — minimum cross-section mm² per string
- `ValidationMessage` — `{ level: 'error' | 'warning' | 'info', message: string }`
- `ProjectResult` — all of the above combined

---

## Validation

Validate that:
- Location exists
- At least one roof face exists
- At least one panel type and one roof panel assignment exist
- Referenced IDs exist (roof_face_id, panel_type_id, mppt_type_id, battery_type_id)
- Numeric fields are valid positive numbers
- Orientation is from the allowed set
- Battery chemistry is from the allowed set
- Warnings for suspicious values: tilt > 75°, latitude outside ±66°, Wp < 50 or > 800, panel count > 50

---

## Calculations

### Solar yield

Use a built-in lookup table of **Peak Sun Hours (PSH)** indexed by latitude band and month.
Include bands: 0–10°, 10–20°, 20–30°, 30–40°, 40–50°, 50–60° (12 monthly values each).
Apply a simplified orientation/tilt correction factor.

Calculate:
- Installed Wp per roof face
- Estimated monthly yield (kWh) per roof face
- Total monthly and yearly yield

### String configuration

For each roof face:
- Max series panels = floor(MPPT max_voc / (panel Voc × 1.14)) — cold temperature correction
- Max parallel strings = floor(MPPT max_charge_current / panel Imp)
- Flag if configuration exceeds MPPT limits

### MPPT suggestions

- Match each roof face against available MPPT types
- Suggest which MPPT controller(s) to use and how many
- Warn if no MPPT controller in the database can handle the configuration

### Battery sizing

Based on preferences (daily consumption, autonomy days, target voltage, battery type):
- Minimum bank capacity (kWh and unit count)
- Maximum recommended bank
- Series/parallel config for target voltage

### Cable sizing

Based on max current, cable length, system voltage, 3% max voltage drop:
- Suggest minimum cable cross-section from standard sizes: 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50 mm²

---

## Output

### Terminal output

Print clearly structured sections:
1. Input summary (location, roof faces, panels)
2. Per-roof-face summary (Wp, panel count, area usage)
3. Monthly production table (month × roof face + totals)
4. Yearly production estimate
5. String configuration per roof face
6. MPPT controller suggestions
7. Battery sizing recommendation
8. Cable sizing suggestion
9. Warnings and errors

### Markdown report

Write the same output to `report.md` in the working directory.

---

## Architecture

```
src/
  cli/        # Entry point, argument parsing, menu (inquirer)
  db/         # SQLite schema init, CRUD queries (better-sqlite3)
  domain/     # TypeScript interfaces
  validation/ # Input validation, ValidationMessage[]
  calc/       # Pure calculation functions
  output/     # Terminal formatter, Markdown report writer
```

Rules:
- Node.js + TypeScript, no framework
- No UI beyond the CLI menu
- No external APIs
- Pure functions for all calculations
- Unit tests with Vitest
- Use `better-sqlite3` for SQLite (synchronous, no async complexity)
- Use `inquirer` for interactive prompts
- Use `commander` for CLI argument parsing

---

## Implementation plan

Work in steps. After each step: explain what was built, show the file structure, show how to run it, and **stop for confirmation before proceeding**.

### Step 0 — Ubiquitous language
- Read `~/.codex/skills/ubiquitous-language/SKILL.md`
- Create `GLOSSARY.md` in the project root listing every domain concept with its canonical name, DB table name, TS interface name, and CLI label
- The glossary must match the naming conventions table in this prompt exactly
- **Stop and present the glossary for confirmation before proceeding to Step 1**

### Step 1 — Skeleton
- Project setup (package.json, tsconfig, vitest)
- CLI entry point (`ogos init`, `ogos run`)
- `./menu` launcher script
- `ogos init` creates `project.db` with full schema
- Stub menu with all options visible but not yet functional

### Step 2 — CRUD input flows
- All menu input flows (location, roof faces, panel types, MPPT controllers, battery types, preferences)
- Guided prompts with inline validation
- List and delete flows

### Step 3 — Validation layer
- Full validation on `ogos run`
- Clear error/warning output before calculations proceed

### Step 4 — Calculations
- Yield estimates (PSH table, orientation correction)
- String configuration
- MPPT matching
- Battery sizing
- Cable sizing

### Step 5 — Output
- Formatted terminal output (all sections)
- `report.md` generation
- End-to-end test with seeded sample data

---

## Constraints

- Database is the single source of truth for input
- Never write calculation results back to the database
- Do not overcomplicate the model
- Prefer clarity and correctness over cleverness
- Keep dependencies minimal
