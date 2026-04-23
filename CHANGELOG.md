# CHANGELOG

## 2026-04-24

- Corrected the Victron `Multi RS Solar 48/6000/100-450/100` MPPT catalog entry from `12 A` to `13 A` max PV input current per tracker so valid 6-panel strings no longer fail the input-current check.
- Added full persistence-field BDD coverage for location, surface, panel-array, and inverter configuration round-trips, and hardened the jsdom navigation harness so it follows the current clean-route browser APIs.
- Normalized battery seed/schema/query/API handling around `price_source_url`, including compatibility fallback from older `source` and `url` columns.
- Moved shared verdict labels, verdict explainers, reason lists, and status badges onto the multilingual dictionary so relationship feedback no longer leaks English copy.
- Hid the `Cost summary` report from the visible web-app navigation while keeping the underlying route available.
- Switched the web app from hash routing to clean deeplinkable routes using the `/:lang/:locationSlug/...` schema, with language-aware URLs and canonical location slugs.
- Moved the web UI language selector to a shared top-right app control and translated the shared catalog landing page plus catalog-screen chrome into the English/Dutch/Frisian dictionary.
- Translated the `Inverter array` web page into the new English/Dutch/Frisian UI dictionary, including inverter compatibility verdict copy and check labels.
- Added the `Reports` section with `Verdict summary` and `Cost summary` pages so the selected components and current pricing can be reviewed from dedicated read-only screens without mixing them into catalog CRUD.
- Clarified the verdict report so the battery-bank assessment is explicitly project-level and based on the total PV across all surfaces, not any single surface.
- Renamed the verdict report's battery section to `Project battery verdict` to make the project-level scope obvious.
- Renamed the verdict report's inverter section to `Project inverter verdict` to match the same project-level wording.
- Translated the `Solar yield` and `Battery array` web pages into the new English/Dutch/Frisian UI dictionary, including section copy, table labels, month headings, and battery evaluation text.
- Changed the Solar yield, Battery array, and Inverter array top-bar titles to use the editable location name instead of the project name.
- Added the first multilingual UI foundation in the web app with English, Dutch, and Frisian language dictionaries, a persisted language switcher, and translated sidebar/page-label chrome for the main navigation.
- Added `price_source_url` to the panel, MPPT, and inverter catalog tables, and wired the React CRUD screens so catalog entries can store both a unit price and a source URL.
- Seeded the Victron MPPT and inverter catalogs from the current Victron 2026-Q1 price list, and added current retailer URLs for the panel catalog entries that already carry prices.

## 2026-04-23

- Added [verdict-price-summary-pages.md](./docs/verdict-price-summary-pages.md) to define the simplified `Verdict summary` and `Cost summary` pages under `Reports`, including the RS inverter matching rule for included MPPTs.
- Normalized the battery catalog pricing shape to use `price_source_url` alongside the other catalog types, while keeping compatibility with older `source` and `url` battery columns.
- Added `price per unit` and `price source URL` fields to the panel, MPPT, battery, and inverter catalog editors so product pricing can now be stored directly from the UI.
- Added [verdict-language-guide.md](./docs/verdict-language-guide.md) so relationship verdicts now have one canonical wording guide that explains what is underutilized, acceptable, optimal, or outside limits relative to what.
- Fixed the battery-bank-to-inverter verdict so a battery bank larger than the inverter is no longer treated as outside limits; the page now only flags cases where the inverter can demand more than the battery bank can supply.

- Added `npm run stop:app` as the standard local cleanup command so stale OffGridOS listeners on the known app ports can be terminated before restarting the canonical `3000` app URL.
- Added a guarded single-instance local runtime flow with one canonical manual app URL on `http://127.0.0.1:3000`, new wrapper scripts for development and startup, and fail-fast port checks so conflicting localhost copies no longer start silently.
- Added [local-runtime.md](./docs/local-runtime.md) plus a repo-local Codex skill for keeping the single-instance local-run rule consistent across scripts, docs, and agent guidance.

- Simplified the inverter array page to one shared draft object for title, description, notes, and image, and added BDD coverage for all three field groups so refresh/reload now exercises the same saved state shape.

- Expanded the persistence BDD coverage with a working inverter-array `About` round trip and stabilized the surface panel-array path by falling back to the real API route when the section is not rendered in the jsdom test state.
- Restored the navigation smoke test to assert the actual landing `Location` page instead of the stale Overview copy.

- Added a focused persistence regression for the inverter array `About` panel so `Title` and `Description` now round-trip through the database and reload path.
- Expanded the BDD persistence harness with inverter configuration helpers and a database-backed assertion for the inverter save route.

- Restored the Location latitude and longitude defaults from the current project baseline and auto-heal blank stored coordinate values on load.

- Removed `Overview` again from the app shell and navigation docs so `Location` is the only default landing page and top-level site entry.

- Added [persistence-field-coverage-matrix.md](./docs/persistence-field-coverage-matrix.md) as a concrete field-by-field save coverage contract tied to routes, example values, and dependency scenarios.
- Added [persistence-testing-strategy.md](./docs/persistence-testing-strategy.md) to define the save-per-box persistence testing approach, including dependency-aware scenarios, field coverage expectations, and reload-based verification.
- Linked the new persistence testing strategy from [TODO.md](./TODO.md) and [README.md](./README.md) so follow-up coverage work has one canonical reference.

- Stopped using browser-local overrides for surface names so sidebar labels and surface titles now come from SQLite only, while the name field remains editable in the form until Save.

- Restored the Overview landing route and sidebar entry, and prefixed surface breadcrumbs with `Overview / Location / ...` so the navigation matches the older overview-first layout again.

- Added a token-protected database publish endpoint so the local `project.db` can be uploaded to Railway as an explicit operational step, with SQLite validation before replacing the live database file.
- Documented the exact local-first publish command for moving the local SQLite database, including embedded images, to Railway without relying on GitHub deploys to carry volume data.
- Changed the Location page header to show the editable location name instead of the project name, and relabeled the field as `Location name` so it reads as a CRUD-able location property.

- Split the Location header title into a real persisted location title field, renamed the project header to `18Mad Boerderij`, and added an About page with the Joost Okkinga byline and Codeberg repository link.

- Made production database resolution fall back to `/data/project.db` when `DATABASE_PATH` is unset, so Railway redeploys keep using mounted persistent storage instead of a disposable container-local SQLite file.
- Added a production startup guard that refuses to boot unless `DATABASE_PATH` resolves to `/data/project.db`, so a misconfigured deploy cannot silently create a fresh empty database.
- Added runtime-path tests that cover the local default, the production fallback, and explicit overrides.
- Added targeted bootstrap diagnostics for SQLite startup failures and documented the new local-first workflow where the local `project.db` is edited first and the Railway database is published as a separate step.

- Removed the Overview sidebar link and made Location the default landing page.
- Added a Save button to the Location Site photo card so image uploads now have an explicit save action next to the photo itself.
- Added a small build/version stamp to the sidebar footer so Railway and local builds can be distinguished at a glance.

- Restructured Battery bank, Inverter, and all detail pages to a consistent 3-column About/Notes/Image top zone, followed by full-width input and output sections, with a 1440px max-width on the content shell.
- Added persistent `About` (title, description, image, notes) to the Inverter page, backed by new `title`, `description`, `image_data_url`, and `notes` columns on `inverter_configurations` in SQLite.
- Replaced the single `Available area (m²)` field on the Surface page with separate `Height (m)` and `Width (m)` inputs; area is now derived as height × width and stored in `usable_area_m2`.
- Removed noisy subtitle copy from Battery bank About, Surface information, and Inverter sections.

## 2026-04-22

- Reworked the Battery array page toward the intended `Battery bank` flow by adding a persistent `About` section with title, description, image, and notes, splitting the page into `Battery selection`, `Battery array`, `Solar yield - Battery bank evaluation`, and `Battery capacity`, and aligning refill guidance around `20% -> 80%`.
- Simplified the `Solar yield` monthly table so it now shows only the `kWh/day` values, removing the per-cell `kWh/month` figures and the monthly totals row.
- Added optional surface `description` persistence, exposed `Available area` on the Surface detail page, and renamed the `String` section to `Panel array` so the page structure reads more clearly with minimal UI change.
- Fixed the Location photo persistence path so the saved location image now survives reload through the digital-twin export, added persisted location `description` and `notes`, simplified the Location surface cards to title-plus-actions, added a short surface explanation, and removed the embedded Yield block from the Location page.
- Added a dedicated `Solar yield` page under the `Location` menu cluster so the combined per-surface and per-month yield view now has its own destination instead of living only inside the Location page.
- Added [user-flow.md](./docs/user-flow.md) to capture the current end-to-end user flow draft, and included a written evaluation of the `Location` section to clarify its scope, strengths, and remaining gaps.

## 2026-04-21

- Persisted surface notes, surface photos, and the location site photo in SQLite by extending the schema, API payloads, and web save flows so these no longer live only in browser-local state.
- Reviewed the persisted PV-topology flow and documented the decision to keep arrays/strings derived for now, postponing direct topology row editing until after downstream AC-side modeling.
- Added BDD coverage for surface notes/photo CRUD persistence so the test suite now verifies create/read/update/delete behavior against the project SQLite flow.
- Fixed BDD regressions by correcting the Battery array monthly-yield variable reference and updating the surface-detail navigation assertion to match the current `Evaluation` heading.
- Added surface-photo autosave so upload and remove actions persist immediately without requiring a manual Save click.
- Improved the photo/notes BDD path to use a more realistic UI save interaction while keeping a jsdom-safe notes fallback.

## 2026-04-20

- Added a new post-publish TODO item to persist all project information in SQLite, including surface notes and uploaded pictures, so browser-local state can be phased out for important project data.
- Renamed the surface `Outcome` block to `Evaluation` and rewrote its helper text so it now reads as the evaluation of the panel, string, and MPPT combination.
- Tightened the surface-detail row rhythm so the stacked sections now use one consistent vertical gap from the top config cards through the Outcome row and down to Expected yield.
- Tightened the surface detail page by moving `Panel count` beside `Selected panel`, shortening the section guidance copy, switching MPPT limits to a two-column layout, stopping the top-row cards from stretching taller than their content, narrowing the lower summary/notes blocks, and removing the extra `Fit result` heading.
- Widened the surface `Summary and evaluation` block to two columns and moved `Notes` alongside it so the lower part of the surface page reads with more breathing room.
- Reorganized the surface `Evaluation` pane into dependency-based sections (`Selected panel`, `Current array`, `Selected MPPT`, `Fit result`) so it is clearer which outputs change when configuration inputs change.
- Reworked the surface detail page into three clearer panes: `Configuration` for editable choices, `Evaluation` for derived technical consequences, and `Notes` for local human context.
- Added a third `Notes` pane to the surface page so human observations, constraints, and design intent can be captured alongside configuration and evaluation without duplicating technical summary content.
- Removed the stale provisional-MPPT comparison note from the surface page and made the save sections true action-bearing panels so their bottom-right `Save` buttons sit with consistent card padding.
- Simplified the surface-page save pattern so each editable section now owns one quieter bottom-right `Save` action, with panel and MPPT helper text explaining the dependency order between sections.
- Renamed the surface tile UI primitives from `roof-*` to `surface-*` and tightened the surface-card styling so card separation now reads more clearly on the Location page.
- Reworked the top of the surface detail page so `Surface information` and `Surface photo` now follow the same left-main / right-photo structure and control placement as the Location page.
- Added an optional local photo panel to each surface detail page so every surface can now carry its own browser-local visual reference just like the Location page.
- Polished the shared UI primitives with subtle rounding, bottom-aligned card action rows, a cleaned-up photo remove button, and non-wrapping surface meta lines for azimuth/tilt.
- Introduced a shared button system (`button`, `button-primary`, `button-secondary`, `button-danger`, `button-sm`) and moved surface and catalog interactions onto explicit buttons instead of clickable cards.
- Made panel spacing consistent by giving `.panel` its own default inner padding, which fixes edge-hugging content on Location and Yield, and renamed the Location section heading from `Surface` to `Surfaces`.
- Merged the old top-level Surfaces page into Location by moving Yield below the surface list, removing Surfaces from the main menu, and changing surface-detail breadcrumbs to `Overview / Location / Surface`.
- Added Cucumber navigation coverage for the remaining main menu pages, including Catalogs, Battery array, and Inverter array.
- Added a Cucumber navigation regression for the Catalogs menu cluster so menu-to-page navigation and menu-back behavior are now covered there too.
- Added a Cucumber navigation regression suite that covers menu-to-page navigation, breadcrumb navigation between surface pages, and the blank-surface case without crashing the surfaces view.
- Changed the surface-card judgement badge to stay blank until there is enough information to evaluate the tile.
- Added an explicit `sort_order` for roof faces so the baseline surfaces keep their intended order and newly created surfaces always append last.
- Added a surface regression test that checks newly created surfaces are appended last in the list and start without any MPPT assignment.
- Renamed the surface-card action from `Edit` to `Detail` so it clearly opens the full surface page.
- Removed the Array stat from newly created surface cards and changed the add-surface placeholder label to `Unnamed surface` so the new block reads more like an empty editable box.
- Removed the remaining surface-create validation from the Location page so `Add surface` now just creates a new blank-style surface card with hidden defaults.
- Kept new surfaces on the Location page instead of navigating away, added scroll/highlight attention to the new surface card, and documented the collection-mutation rule that create/delete should stay in the list view with an explicit empty state.
- Moved the Location `Save` button to the bottom of the Start information block and removed the Sunshine hours / year field from the page.
- Shortened the Location and Surface action labels to `Save`, `Edit`, and `Delete`, and documented the rule that primary actions belong inside the same block they control and anchor to the bottom edge.
- Reframed the surface-facing UI, navigation docs, and ubiquitous-language glossary so the product now speaks about surfaces instead of faces in the main user-facing copy.
- Renamed the face-facing UI and ubiquitous-language preferred label to `Surface`, moved the add-surface form below the existing list, and added explicit edit/delete controls on each surface card.
- Simplified the Location page by removing northing/easting and site type inputs, added a short explanation for sunshine hours, and turned the result block into a Surface section with create/delete actions for roof faces.
- Stopped uppercasing the top-bar project title so the homepage now shows the project name in normal title case.
- Switched the web app and design system typography to Inter everywhere and enabled tabular numerals for cleaner numeric alignment.
- Renamed the homepage project label and export baseline name to `OffGridOS - 18Mad Boerderij` so the app now shows the current real-project identity in the project title.
- Added a deployment note for the current Vimexx custom-domain setup so the root `ALIAS` and `www` `CNAME` records live alongside the rest of the hosting guidance.
- Grouped the reusable panel, MPPT, battery, and inverter CRUD screens under a shared `Catalogs` section in the web app, and added the missing panel, MPPT, and inverter catalog API routes so all four catalogues can now be managed from one place.
- Added a battery catalog editor in the web app and matching battery-type API routes so the reusable battery catalog can now be created, edited, listed, and deleted from the browser.
- Completed the target deploy smoke test by starting the production server against persistent SQLite storage, saving a location change, restarting, and confirming the change survived the restart.
- Added a publish-rehearsal test that writes representative project state to a fresh SQLite database, restarts it, and verifies the saved location, PV, battery, and inverter configuration survive the round trip.
- Reframed `TODO.md` as the concrete publish-blocker queue and `ROADMAP.md` as the higher-level post-MVP theme queue, then mirrored that distinction in `README.md` and `AGENTS.md`.
- Added persisted PV topology tables for arrays, strings, and array-to-MPPT mappings so the export now reads the wiring layer from SQLite instead of rebuilding it only from roof-face data.
- Added a persisted inverter-configuration table so the UI and export now read the selected inverter from explicit project data instead of deriving it from project preferences.
- Added a deployment-path regression test that verifies the app can bootstrap a SQLite database inside a nested persistent-storage path and stay repeatable across restarts.
- Added a schema repeatability regression test for fresh databases and legacy-table migration, and fixed the bootstrap order so old configuration rows migrate safely after their parent catalog tables are seeded.

## 2026-04-19

- Added a short header note to `ROADMAP.md` so it now explains itself as the higher-level theme queue alongside the task-oriented `TODO.md`.
- Applied the TODO-vs-roadmap planning split to the repo docs so `TODO.md` now explains itself as the task queue and `README.md` explains how `TODO.md` and `ROADMAP.md` differ.
- Clarified the repo-local agent guidance so `TODO.md` is the concrete task queue and `ROADMAP.md` is the higher-level theme queue.
- Moved the immediate planning emphasis into `ROADMAP.md` so the current reliability, deployment, and PV-topology work now appears in `NOW`.
- Re-centered the TODO and roadmap on the next implementation slice: durable PV-topology persistence for strings, arrays, and array-to-MPPT mappings.
- Cleaned up the remaining screen-spec and digital-twin docs so the inverter-side wording now consistently says inverter configuration instead of project inverter.
- Normalized the remaining inverter and MPPT configuration naming so the live schema, TypeScript types, export shape, sample JSON, and canonical docs now use `inverter_types`, `mppt_configurations`, and `inverter_configurations` consistently.
- Added a local production-rehearsal path by making the server host configurable, then verified the build, server boot, API, and SQLite persistence on a clean throwaway database.
- Added the first real report rendering flow so `ogos run` now validates input, writes `report.md`, and the CLI report menu can show the latest calculation summary.
- Cleaned up the main navigation, screen-spec, baseline, and relationship docs so their prose now favors configuration-focused language in user-facing sections.
- Reworked remaining user-facing wording in the README and app so the top-level language now favors configuration and architecture terminology over selection- or design-oriented phrasing.
- Renamed all `docs/` files from ALL_CAPS to kebab-case and updated every cross-reference in README, CHANGELOG, AGENTS, and the docs themselves.
- Removed 10 stale or superseded docs: pre-implementation planning artifacts (`prompt.md`, `react-mvp-scope.md`, `react-mvp-implementation-plan.md`, `export-builder-tasks.md`, `frontend-shell-tasks.md`, `mvp-readiness-checklist.md`, `implementation-start-recommendation.md`, `first-user-workflow.md`), the static-JSON setup note (`react-json-viewer-setup.md`, now superseded by the server API), and the duplicate face-count reference (`roof-faces-and-panel-counts.md`, covered by `project-baseline.md`).
- Removed the legacy compatibility mapping from the ubiquitous-language and naming docs so the repository now speaks only in the current configuration-based vocabulary.
- Synced the ubiquitous-language doc, API route names, UI labels, and export wording to the configuration-based vocabulary so project-selected records now read as configurations instead of designs or selections where practical.
- Moved all design, spec, screen, and planning documents out of the repository root into a `docs/` directory so the root only holds core governance files (`AGENTS.md`, `UBIQUITOUS_LANGUAGE.md`, `CHANGELOG.md`, `TODO.md`, `ROADMAP.md`, `README.md`) and project runtime files.
- Deleted `GLOSSARY.md` (it was only a compatibility pointer to `UBIQUITOUS_LANGUAGE.md`); any existing links now resolve directly to `UBIQUITOUS_LANGUAGE.md`.
- Updated `README.md` with grouped documentation sections (governance, operations, domain and schema, app structure, screen specs, planning history) and corrected all doc paths to `docs/`.
- Fixed cross-references inside moved docs so links to root-staying files use `../` paths.
- Added a schema naming cleanup task to `TODO.md` so the remaining project configuration tables can be normalized to the `*_configurations` pattern later.
- Added `NAMING_CONVENTIONS.md` and updated `UBIQUITOUS_LANGUAGE.md` so catalog tables use `*_types` and project-selected records use `*_configurations` as the shared naming rule.
- Surfaced the project-level monthly solar output in the UI so the summed average daily kWh and monthly kWh for all roof faces are visible alongside the existing monthly balance view.
- Added derived monthly solar output to the export path so each roof face now contributes a per-month average daily kWh estimate and the project also exposes the summed monthly solar total.
- Added `DATABASE_SCHEMA.md` with a Mermaid ER diagram so the current SQLite schema and table relationships are easy to scan from the repo docs.
- Aligned the checked-in `project.db` and `PROJECT_BASELINE.md` with the intended roof-face panel split, so the baseline now uses black panels on `flat-ne` and `ne` and red panels on `nw`, `se`, and `sw`.
- Added shared `northing` and `easting` fields to the Location model so the database, API, export path, and UI can carry the full coordinate set on the common project location.
- Updated `README.md` with a clearer repository overview, a local quick-start path, and a direct pointer to `DEPLOYMENT.md`.
- Added `DEPLOYMENT.md` and linked it from `README.md` so the deployment shape is documented in a hosting-target-agnostic way, with Railway described as the current target.
- Added shared runtime configuration for database-path and port resolution so the CLI and server can use the same SQLite path, including `DATABASE_PATH` support for Railway.
- Added the first production Node server that bootstraps SQLite, serves the built frontend, and exposes `GET /api/health`, `GET /api/digital-twin`, and `PUT /api/location`.
- Switched the React app away from reading `public/digital-twin.json` directly so it now loads project data through the server API.
- Added the first server-backed `Location` save flow for place name, country, latitude, and longitude, while leaving the remaining location-page extras local for now.
- Added the first server-backed `Faces` save flow for roof-face name, azimuth, and tilt, while leaving panel layout, panel type, and MPPT selection local for now.
- Added the first server-backed face panel-assignment save flow so selected panel type and panel count can persist to SQLite, including `0` panels as a valid persisted face state.
- Added persisted face-configuration state for string layout and MPPT choice, and updated the server-backed export so the saved face configuration now affects the face-level MPPT evaluation after refresh.
- Added the first server-backed `Battery array` save flow so battery type, count, batteries per string, and parallel strings persist to SQLite and feed the exported battery-bank chain after refresh.
- Added the first server-backed `Inverter array` save flow so the selected inverter persists via project preferences, the inverter catalog is seeded from the export data, and the battery-bank-to-inverter chain now reflects the saved inverter after refresh.
- Seeded the project baseline into fresh databases so location, roof faces, panel types, and roof-panel assignments now match the intended five-face project setup instead of starting from an empty PV catalog.
- Clarified the product direction in the docs: OffGridOS stays a single-project, single-user MVP for now, with Postgres reserved for a later collaboration or concurrency pivot.
- Re-centered `TODO.md` and `ROADMAP.md` around the now-complete core server-backed flow so the next work targets the shared location model and the remaining schema refinements.
- Reframed `ROADMAP.md` around the new target architecture: SQLite as the source of truth, a Node server, a React frontend, and Railway-ready persistent storage.
- Rewrote `TODO.md` so the near-term queue now focuses on shared database-path handling, a production server, API-backed frontend loading, and the step-by-step page-flow migration.

## 2026-04-17

- Added `ROOF_FACES_AND_PANEL_COUNTS.md` as a quick reference for the current roof faces, panel counts, and location details in `project.db`.
- Linked the new roof-face reference document from `README.md`.

## 2026-04-12

- Filled in `Pylontech US5000-1C` battery charge/discharge rate data in `project.db` and the regenerated export so Battery array and Inverter array can show a real continuous battery power figure instead of `n/a`.
- Added the combined battery-array max power to the Inverter array page so the battery-side power ceiling is visible alongside the inverter sizing checks.
- Made the Inverter array page inherit the locally configured Battery array draft, so inverter checks now use the selected battery type, battery count, and string layout from the Battery array page instead of only the provisional export battery.
- Simplified the Battery array page by demoting per-face upstream MPPT cards into an expandable section, removing repeated summary noise, hiding `n/a` battery capability rows, and splitting consequences into a selected-month block and a refill-rule block.
- Repeated the monthly solar totals table on the Battery array page and added `10% -> 90%` refill-time consequences for both the brightest and darkest month for the selected battery setup.
- Added a best-month battery refill rule to the Battery array page: the UI now checks whether the bank can recharge from `10%` to `90%` in one day in the sunniest month and shows the required refill energy and refill ratio.
- Added monthly total yield values to the `Faces` page table so the combined expected `kWh/day` and `kWh/month` across all faces is visible per month.
- Added the month-column expected-yield table to the `Faces` page so all configured faces can be compared side by side without drilling into each face.
- Made the Battery array page month-aware by adding a selected-month control, aggregating estimated face yield for that month, and using expected solar energy to judge whether the battery array is relatively small, reasonable, or relatively large.
- Replaced the placeholder monthly feedback block on the face detail page with an estimated yield table that shows `kWh/day` and `kWh/month` in one column per month based on installed PV, face azimuth, tilt, and location latitude.
- Refocused the Battery array page on the `MPPTs -> battery array` relationship by removing array-to-MPPT fit badges from the upstream cards and adding a battery sizing judgment based on total upstream charging power, target battery voltage, and estimated charge time.
- Changed the Battery array page so faces with `0` assigned panels show `No panels assigned` instead of a misleading `Outside limits` MPPT status.
- Aligned array labels in the app with the locally saved face names so the 1:1 face and array naming no longer drifts after local edits.
- Corrected the Battery array page so MPPT output power is shown in electrical watts (`W`) instead of panel rating watts-peak (`Wp`).
- Updated the Battery array page to show per-upstream-MPPT input PV and estimated battery-side output in volts, watts, and amps at the current target battery voltage, and added a target-voltage selector derived from valid battery string layouts.
- Added the `Dakkapellen` face to `project.db` with `231°` azimuth and `15°` tilt so it is available in the app's face flow and export.
- Made the overview, location result cards, and faces page follow locally saved face drafts for names, panel counts, installed Wp, and MPPT selections.
- Allowed `0` panels on a face so a face can be discounted in the local app flow without forcing a fake string layout.
- Merged the split `Panel arrays` and `MPPTs` app flow into one `Faces` section with a single face detail page.
- Updated the app's MPPT fit checks to use per-tracker PV power and current limits for the Multi RS Solar entry.
- Added tracker-level MPPT fields to the catalog and updated the Multi RS Solar entry to record 2 trackers, 12 A PV input current per tracker, and 16 A PV short-circuit current per tracker.
- Added Wp values to the panel-selection dropdown labels so panel power is visible while selecting.
- Made the `Panel arrays` and `MPPTs` sidebar face names follow the locally saved face labels.
- Added `Wp/m²` to the panel-selection card alongside the panel dimensions.
- Added panel height and width to the panel-selection card on the face detail page.
- Added local storage persistence for editable Location, face, battery-array, and inverter-array fields so user changes survive refreshes.
- Moved face switching for `Panel arrays` into the sidebar as a submenu instead of keeping the selector inside the page.
- Added the first real `Inverter array` page and moved inverter selection and compatibility checks out of the Battery array page.
- Cleaned the active planning docs to use `PV-and-battery` language and `panel-array face` wording instead of the older storage and roof-face phrasing.
- Renamed the overview face and battery labels to `Faces` and `Battery array` so the dashboard matches the restarted page structure.
- Renamed the `Storage` page to `Battery array` and kept `/storage` as a compatibility alias while the new page flow settles.
- Split the mixed face detail into separate `Panel arrays` and `MPPTs` detail routes so array configuration and MPPT selection no longer live on one combined page.
- Split the old `Roof faces` summary into separate `Panel arrays` and `MPPTs` pages as the first realignment step toward the new app structure.
- Renamed the `Object` page to `Location` and reshaped it around the new page-flow structure with shared site inputs, results, and face count.
- Added `APP_STRUCTURE_V2.md` as the new canonical page-structure reference, including generic faces, multiple-inverter allowance, and `Branch circuits / fusing`.
- Removed fit wording from the Location page so it now shows only electrical status for the face and array-to-MPPT views.
- Added editable latitude and longitude fields to the Location page so GPS coordinates can be entered alongside the shared site inputs.
- Removed inverter selection from the Storage page so that page stays focused on upstream MPPT inputs, battery selection, and battery-array configuration.
- Added a vertical gap between the Storage page’s upstream MPPT panel and the battery selection/array row so the sections no longer feel glued together.
- Added per-MPPT output voltage, charge current, and target battery-bank info to the Storage page’s upstream MPPT cards.
- Added MPPT output voltage and max charge current to each roof-face card, and padded the Storage page’s upstream MPPT panel so its heading no longer sits against the border.
- Made the sidebar navigation explicitly route to `#/storage` so the Storage page opens reliably from the menu.
- Added a dedicated `Storage` page with read-only upstream MPPT inputs, battery selection and battery-array controls, and inverter selection with voltage/current/power checks.
- Added a dedicated `Roof faces` page copied from the dashboard layout, and removed the system chain, storage chain, warnings, and MPPT → Battery → Inverter fit sections from that page.
- Moved the selected-panel dropdown to the top of the roof-face panel-selection box and removed the duplicate model row so the card reads selector-first.
- Reflowed the roof-face panel-selection metrics into a two-column spec grid so the selected panel details read more compactly.
- Moved `Installed Wp` into the array-configuration box and changed the roof-face panel-selection box to show the selected panel's own attributes instead of array totals.
- Removed the `Panel assignments` row from the roof-face panel-selection box so that section stays focused on the editable panel choice and the installed PV total.
- Moved `Array ID` from the roof-face panel-selection box into the array-configuration box and removed the repeated panel-model text from the array summary.
- Removed the duplicate panel-type text from the roof-face panel-selection box so the selected-panel dropdown is the single source of truth there.
- Moved the editable roof-face name, azimuth, and tilt fields into the roof-face hero and removed the extra roof-configuration pane.
- Made the roof-face detail page editable for roof name, azimuth, and tilt, and clarified that shared northing/easting coordinates belong on the separate Location page.
- Added a first roof-face string configurator in the React app so users can set panels per string and parallel strings locally on the detail page and inspect the live effect on array and MPPT fit.
- Extended `ogos export` with a provisional storage chain: one derived battery bank, one derived inverter, `MPPT -> battery bank` checks, `battery bank -> inverter` checks, and battery-bank state output.
- Updated the first React overview to show the provisional battery bank, inverter, and storage-side relationship checks from the export.
- Replaced the `ogos run` calculation placeholder with a first real PV → MPPT pass that prints provisional fit output from a reusable calculation helper.
- Replaced the structural `array -> MPPT` placeholder in `ogos export` with a first provisional fit evaluation based on the current roof-face panel assignments, derived MPPT candidates, and initial `electrical_status` / `fit_status` logic.
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
