# TODO

## NOW

- Replace provisional derived selections with explicit persisted project data for arrays, MPPT configurations, battery-bank configuration, and inverter configuration.
- Tighten seed data and schema migration checks so database setup stays repeatable across fresh and existing projects.
- Verify Railway deployment with the persistent-storage database path so production behaves the same as local.

## NEXT

- Normalize the remaining project configuration table names to the `*_configurations` pattern once the schema migration plan is ready.
- Define and implement the first durable schema slice for PV-side topology and battery-bank linkage when the current configuration is stable enough to encode.
- Add the remaining input flows and CRUD coverage for any schema tables that are still read-only from the CLI or web app.
- Implement the report rendering flow so `report.md` contains a useful summary of inputs, validation results, and calculated outputs.

## LATER

- Add richer downstream AC-side modeling for branch circuits, consumers, and generator scenarios in the web app and calculation layer.
- Add durable import and export support for project data without making the frontend depend on generated JSON files.
- Improve the CLI experience with richer summaries, navigation shortcuts, and clearer status reporting.
- Review packaging and distribution so the command-line entrypoint and deployed web app both stay easy to run.
