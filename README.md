# OffGridOS

OffGridOS is a single-project, single-user off-grid system planning tool built around a small SQLite project database, a Node server, and a React web app.

The core flow — location, faces, battery array, inverter array — is server-backed and persists to SQLite. The next work targets replacing provisional derived selections with explicit persisted project data and stabilising the schema.

## Quick Start

Install dependencies:

```bash
npm install
```

Create or verify the local database:

```bash
npx tsx src/cli/index.ts init
```

Run the web UI in development:

```bash
npm run dev:web
```

Build the production app:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

For deployment and persistent-storage requirements, see [deployment.md](./docs/deployment.md).

## Documentation

### Repository governance

- [AGENTS.md](./AGENTS.md): repository-specific working conventions and durable guidance.
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md): canonical terminology for domain concepts, PV topology, and naming rules.
- [TODO.md](./TODO.md): concrete near-term work queue, organized as `NOW`, `NEXT`, and `LATER`.
- [ROADMAP.md](./ROADMAP.md): higher-level direction and deferred work, also organized as `NOW`, `NEXT`, and `LATER`.
- [CHANGELOG.md](./CHANGELOG.md): reverse-chronological log of notable repository changes.

### Operations

- [deployment.md](./docs/deployment.md): deployment guide for running the Node server, React frontend, and persistent SQLite database, with Railway as the current target.

### Domain and schema

- [naming-conventions.md](./docs/naming-conventions.md): target naming rule for catalog tables, project configurations, and derived outputs.
- [database-schema.md](./docs/database-schema.md): Mermaid ER diagram of the current SQLite schema and how the core tables relate to each other.
- [project-baseline.md](./docs/project-baseline.md): current real-project baseline and intended configuration details from `project.db`.

### App structure and design

- [app-structure-v2.md](./docs/app-structure-v2.md): current preferred page-by-page app structure, including the stepwise flow from location through consumers and dashboard.
- [app-navigation.md](./docs/app-navigation.md): navigation structure connecting the overview and subsystem drill-down screens.
- [digital-twin-model.md](./docs/digital-twin-model.md): component graph, bidirectional dependency model, and monthly scenario views.
- [digital-twin-data-model.md](./docs/digital-twin-data-model.md): entities, relationships, evaluation fields, and JSON export shape.
- [digital-twin-db-extension.md](./docs/digital-twin-db-extension.md): phased plan for which digital twin entities should be persisted in SQLite and in what order.
- [digital-twin-types.md](./docs/digital-twin-types.md): TypeScript-facing draft of the digital twin object model and relationship evaluation shape.
- [relationship-evaluation-guide.md](./docs/relationship-evaluation-guide.md): statuses and reason codes for evaluating compatibility across the system chain.
- [monthly-usage-model.md](./docs/monthly-usage-model.md): first-pass design for seasonal usage variation and monthly factors.
- [json-export-shape.md](./docs/json-export-shape.md): API export contract for the React app, including entities, relationships, derived results, and metadata.

### Screen specs

- [first-screen-layout.md](./docs/first-screen-layout.md): overview screen layout and what it should show on load.
- [roof-face-array-screen.md](./docs/roof-face-array-screen.md): detailed screen for one roof face, its array, and MPPT fit evaluation.
- [battery-inverter-screen.md](./docs/battery-inverter-screen.md): detailed screen for the battery bank, inverter, and their evaluated relationships.
- [monthly-balance-screen.md](./docs/monthly-balance-screen.md): seasonal system screen for monthly surplus, deficit, battery pressure, and generator dependence.
- [branch-circuit-consumer-screen.md](./docs/branch-circuit-consumer-screen.md): future screen for downstream branch circuits, consumers, and AC-side distribution.
