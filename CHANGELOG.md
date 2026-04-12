# CHANGELOG

## 2026-04-12

- Changed `ogos export` to write to `public/digital-twin.json` by default so the local React app reads the latest export without a manual copy step.
- Added the first `ogos export` command and digital-twin JSON export foundation, deriving arrays and provisional project MPPTs from current roof-face assignments.
- Added `IMPLEMENTATION_START_RECOMMENDATION.md` to mark the transition point from design work into the first implementation slice.
- Added `MVP_READINESS_CHECKLIST.md` to define when the current design is stable enough to start implementation.
- Added `FRONTEND_SHELL_TASKS.md` to break the first React shell into concrete implementation tasks.
- Added `EXPORT_BUILDER_TASKS.md` to break the first JSON export foundation into concrete implementation tasks.
- Added `REACT_MVP_IMPLEMENTATION_PLAN.md` to stage the MVP build from export foundation through the first drill-down screens.
- Added `REACT_MVP_SCOPE.md` to define the first realistic implementation boundary for the React app.
- Added `APP_NAVIGATION.md` to define the first navigation structure across overview and subsystem screens.
- Added `MONTHLY_BALANCE_SCREEN.md` to define the seasonal monthly balance screen where the whole system comes together.
- Added `BRANCH_CIRCUIT_CONSUMER_SCREEN.md` to define the downstream AC-side distribution drill-down screen.
- Added `BATTERY_INVERTER_SCREEN.md` to define the detailed battery-bank and inverter drill-down screen.
- Added `ROOF_FACE_ARRAY_SCREEN.md` to define the main detailed roof-face, array, and MPPT drill-down screen.
- Added `FIRST_SCREEN_LAYOUT.md` to define the initial React overview screen and first-load information hierarchy.
- Added `JSON_EXPORT_SHAPE.md` with a detailed first-pass export contract for the frontend.
- Added `FIRST_USER_WORKFLOW.md` to define the first end-to-end digital twin workflow and initial UI views.
- Added `PROJECT_BASELINE.md` to distinguish the current `project.db` contents from intended next project-specific configuration choices.
- Added `MONTHLY_USAGE_MODEL.md` to define the first-pass monthly and seasonal usage model.
- Added `RELATIONSHIP_EVALUATION_GUIDE.md` to define shared statuses and reason codes across evaluated system relationships.
- Clarified that a `consumer` may be an individual appliance or a modeled load group within a branch circuit.
- Clarified that `consumer` means a concrete endpoint or appliance, while `branch circuit` is the protected group above it.
- Replaced `fused group` with `branch circuit` in the digital twin design docs and removed `Twin*` prefixes from the type draft.
- Added `DIGITAL_TWIN_TYPES.md` with a TypeScript-facing draft of the digital twin object model.
- Added `DIGITAL_TWIN_DB_EXTENSION.md` with a phased SQLite extension proposal for the digital twin.
- Added `DIGITAL_TWIN_DATA_MODEL.md` with the first concrete draft of entities, relationships, and JSON export shape for the digital twin.
- Added a general relationship-evaluation rule using `electrical_status` and `fit_status` across the full system chain.
- Switched the canonical MPPT-fed PV grouping term from `string group` to `array` and introduced `MPPT input fit` terminology.
- Added `UBIQUITOUS_LANGUAGE.md` as the canonical terminology source and updated repo guidance to maintain it throughout future work.
- Converted `GLOSSARY.md` into a compatibility pointer to `UBIQUITOUS_LANGUAGE.md`.
- Added `DIGITAL_TWIN_MODEL.md` to capture the digital twin direction, including roof-face string topology, bidirectional impact views, and monthly variation.
- Expanded `REACT_JSON_VIEWER_SETUP.md` with a simple architecture and deployment flow.
- Added `REACT_JSON_VIEWER_SETUP.md` to document the React app and JSON export inspection setup.
- Added repository hygiene docs: `TODO.md`, `ROADMAP.md`, `CHANGELOG.md`, and `AGENTS.md`.
- Standardized `TODO.md` and `ROADMAP.md` around the `NOW` / `NEXT` / `LATER` layout.
- Updated `README.md` to document the role of the repository docs.
