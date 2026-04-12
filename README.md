# OffGridOS

CLI solar configuration tool for off-grid system planning.

## Documentation

- [AGENTS.md](./AGENTS.md): repository-specific working conventions and durable guidance.
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md): canonical terminology for domain concepts, PV topology, and naming rules.
- [TODO.md](./TODO.md): concrete near-term work queue, organized as `NOW`, `NEXT`, and `LATER`.
- [ROADMAP.md](./ROADMAP.md): higher-level direction and deferred work, also organized as `NOW`, `NEXT`, and `LATER`.
- [DIGITAL_TWIN_MODEL.md](./DIGITAL_TWIN_MODEL.md): design note for the component graph, bidirectional dependency model, and monthly scenario views.
- [DIGITAL_TWIN_DATA_MODEL.md](./DIGITAL_TWIN_DATA_MODEL.md): concrete draft of entities, relationships, evaluation fields, and JSON export shape.
- [DIGITAL_TWIN_DB_EXTENSION.md](./DIGITAL_TWIN_DB_EXTENSION.md): proposal for which digital twin entities should be persisted in SQLite and in what migration order.
- [DIGITAL_TWIN_TYPES.md](./DIGITAL_TWIN_TYPES.md): TypeScript-facing draft of the digital twin object model and reusable relationship evaluation shape.
- [RELATIONSHIP_EVALUATION_GUIDE.md](./RELATIONSHIP_EVALUATION_GUIDE.md): recommended statuses and reason codes for evaluating compatibility across the system chain.
- [MONTHLY_USAGE_MODEL.md](./MONTHLY_USAGE_MODEL.md): first-pass design for seasonal usage variation, monthly factors, and when richer usage profiles may be needed later.
- [PROJECT_BASELINE.md](./PROJECT_BASELINE.md): current real-project baseline and intended next project-specific configuration details from `project.db`.
- [FIRST_USER_WORKFLOW.md](./FIRST_USER_WORKFLOW.md): first end-to-end user workflow and suggested initial React views for the digital twin.
- [JSON_EXPORT_SHAPE.md](./JSON_EXPORT_SHAPE.md): detailed first-pass export contract for the React app, including entities, relationships, derived results, and metadata.
- [FIRST_SCREEN_LAYOUT.md](./FIRST_SCREEN_LAYOUT.md): recommended first overview screen layout for the React app and what it should show on load.
- [ROOF_FACE_ARRAY_SCREEN.md](./ROOF_FACE_ARRAY_SCREEN.md): recommended detailed screen for one roof face, its array, and MPPT fit evaluation.
- [BATTERY_INVERTER_SCREEN.md](./BATTERY_INVERTER_SCREEN.md): recommended detailed screen for the battery bank, inverter, and their evaluated relationships.
- [BRANCH_CIRCUIT_CONSUMER_SCREEN.md](./BRANCH_CIRCUIT_CONSUMER_SCREEN.md): recommended detailed screen for downstream branch circuits, consumers, and AC-side distribution.
- [MONTHLY_BALANCE_SCREEN.md](./MONTHLY_BALANCE_SCREEN.md): recommended seasonal system screen for monthly surplus, deficit, battery pressure, and generator dependence.
- [APP_NAVIGATION.md](./APP_NAVIGATION.md): first navigation structure for connecting the overview and subsystem drill-down screens.
- [REACT_MVP_SCOPE.md](./REACT_MVP_SCOPE.md): recommended first implementation boundary for the React app, including what to include now and what to postpone.
- [REACT_MVP_IMPLEMENTATION_PLAN.md](./REACT_MVP_IMPLEMENTATION_PLAN.md): staged order of work for turning the MVP scope into a buildable React app.
- [EXPORT_BUILDER_TASKS.md](./EXPORT_BUILDER_TASKS.md): concrete first task breakdown for building the JSON export foundation needed by the React MVP.
- [FRONTEND_SHELL_TASKS.md](./FRONTEND_SHELL_TASKS.md): concrete first task breakdown for building the React shell, routes, and overview-driven UI.
- [MVP_READINESS_CHECKLIST.md](./MVP_READINESS_CHECKLIST.md): checklist for deciding when the design is stable enough to start the first implementation slice.
- [IMPLEMENTATION_START_RECOMMENDATION.md](./IMPLEMENTATION_START_RECOMMENDATION.md): summary of why the project is ready to move from design into the first implementation slice.
- [REACT_JSON_VIEWER_SETUP.md](./REACT_JSON_VIEWER_SETUP.md): reference note for the React app + JSON export inspection setup.
- [CHANGELOG.md](./CHANGELOG.md): reverse-chronological log of notable repository changes.
- [GLOSSARY.md](./GLOSSARY.md): compatibility pointer to the canonical ubiquitous language file.
