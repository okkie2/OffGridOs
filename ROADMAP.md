# ROADMAP

## NOW

- Complete the first digital twin MVP loop: export core project data, evaluate the main system relationships, and render the React overview plus the first drill-down screens.
- Make the system explainable enough that a user can understand upstream/downstream effects and seasonal trade-offs from one shared model.

## NEXT

- Broaden the persisted and exported data model beyond the current PV-and-storage backbone so the tool can manage fuller branch-circuit, consumer, and generator configurations.
- Add better reporting around sizing decisions, trade-offs, statuses, and seasonal warnings so the results are easier to act on.
- Introduce robust import/export paths for moving project data between SQLite, JSON, and the React app.

## LATER

- Support more advanced optimisation and scenario analysis.
- Add richer presentation layers for system visualization, summary output, and reporting.
- Consider multi-project workflows if the repository grows beyond a single `project.db` model.
