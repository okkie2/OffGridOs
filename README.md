
# OffGridOS

OffGridOS is a single-project, single-user off-grid system planning tool built around a small SQLite project database, a Node server, and a React web app.

The core flow - location, production, surfaces, battery bank, converters, load circuits, and loads - is server-backed and persists to SQLite. Reusable panel, MPPT, battery, inverter, and conversion-device catalogs live under a shared `Catalogs` section, and the read-only `Verdict summary` and `Cost summary` pages live under `Reports`. The next work targets replacing provisional derived configurations with explicit persisted project data and stabilising the schema.

For planning, treat `TODO.md` as the concrete publish-blocker queue and `ROADMAP.md` as the post-MVP theme queue.

## Quick Start
Install dependencies:

```bash
npm install
```
Create or verify the local database:

```bash
npx tsx src/cli/index.ts init
```

Run the local app in development:

```bash
npm run dev:app
```

Stop stale local OffGridOS listeners before restarting, if needed:

```bash
npm run stop:app
```

Build the production app:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

OffGridOS now uses one canonical manual browser URL for local work:

```text
http://127.0.0.1:3000
```

Do not use alternate localhost ports for manual app testing. See [local-runtime.md](./docs/local-runtime.md) for the enforced single-instance rule.

For deployment, persistent-storage requirements, and the recommended local-first SQLite publishing workflow, see [deployment.md](./docs/deployment.md).

The current publish workflow keeps `project.db` as the local source of truth and pushes database updates to Railway separately from GitHub code deploys.
Use `npm run publish:db` to upload the local database, or open the CLI menu and choose `Project -> Publish local database to Railway`.

## Documentation

### Repository governance

- [AGENTS.md](./AGENTS.md): repository-specific working conventions and durable guidance.
- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md): canonical terminology for domain concepts, PV topology, and naming rules.
- [TODO.md](./TODO.md): concrete near-term task queue, organized as `NOW`, `NEXT`, and `LATER`.
- [ROADMAP.md](./ROADMAP.md): higher-level theme queue, also organized as `NOW`, `NEXT`, and `LATER`.
- [CHANGELOG.md](./CHANGELOG.md): reverse-chronological log of notable repository changes.

`TODO.md` answers "what do I do next to get the MVP online?" while `ROADMAP.md` answers "what bigger post-MVP theme are we moving toward?" Use the roadmap for direction and the TODO for actionable publish-blocker work items.

### Operations

- [deployment.md](./docs/deployment.md): deployment guide for running the Node server, React frontend, and persistent SQLite database, with Railway as the current target.
- [local-runtime.md](./docs/local-runtime.md): canonical local app URL, guarded startup commands, and the single-instance rule for local development.

### Domain and schema

- [naming-conventions.md](./docs/naming-conventions.md): target naming rule for catalog tables, project configurations, and derived outputs.
- [database-schema.md](./docs/database-schema.md): Mermaid ER diagram of the current SQLite schema and how the core tables relate to each other.
- [project-baseline.md](./docs/project-baseline.md): current real-project baseline and intended configuration details from `project.db`.

### App structure and architecture

- [app-organisation.md](./docs/app-organisation.md): canonical app structure and navigation reference, including top-level menu sections, page ownership, route shape, page-flow rules, and filtering behavior.
- [user-flow.md](./docs/user-flow.md): user-authored end-to-end screen flow with a written evaluation of the `Location` section.
- [verdict-price-summary-pages.md](./docs/verdict-price-summary-pages.md): simplified read-only `Verdict summary` and `Cost summary` page spec under `Reports`.
- [digital-twin-model.md](./docs/digital-twin-model.md): component graph, bidirectional dependency model, and monthly scenario views.
- [digital-twin-data-model.md](./docs/digital-twin-data-model.md): entities, relationships, evaluation fields, and JSON export shape.
- [digital-twin-db-extension.md](./docs/digital-twin-db-extension.md): phased plan for which digital twin entities should be persisted in SQLite and in what order.
- [digital-twin-types.md](./docs/digital-twin-types.md): TypeScript-facing draft of the digital twin object model and relationship evaluation shape.
- [relationship-evaluation-guide.md](./docs/relationship-evaluation-guide.md): statuses and reason codes for evaluating compatibility across the system chain.
- [verdict-language-guide.md](./docs/verdict-language-guide.md): sentence templates for explaining what is underutilized, acceptable, optimal, or outside limits in each relationship.
- [monthly-usage-model.md](./docs/monthly-usage-model.md): first-pass model for seasonal usage variation and monthly factors.
- [json-export-shape.md](./docs/json-export-shape.md): API export contract for the React app, including entities, relationships, derived results, and metadata.

### Screen specs

- [first-screen-layout.md](./docs/first-screen-layout.md): overview screen layout and what it should show on load.
- [roof-face-array-screen.md](./docs/roof-face-array-screen.md): detailed screen for one surface, its array, and MPPT fit evaluation.
- [battery-inverter-screen.md](./docs/battery-inverter-screen.md): detailed screen for the battery bank, inverter, and their evaluated relationships.
- [monthly-balance-screen.md](./docs/monthly-balance-screen.md): seasonal system screen for monthly surplus, deficit, battery pressure, and generator dependence.
- [load-circuit-load-screen.md](./docs/load-circuit-load-screen.md): future screen for downstream load circuits, loads, and AC-side distribution.

### Testing and quality

- [persistence-testing-strategy.md](./docs/persistence-testing-strategy.md): save-box persistence strategy, dependency-aware test approach, and field-coverage guidance for all editable fields.
- [persistence-field-coverage-matrix.md](./docs/persistence-field-coverage-matrix.md): field-by-field save coverage matrix with routes, valid and invalid examples, and recommended primary test layers.
- [docs/skills/offgridos-single-local-instance/SKILL.md](./docs/skills/offgridos-single-local-instance/SKILL.md): repo-local Codex skill for keeping the single-instance local runtime rule consistent.
