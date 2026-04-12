# TODO

## NOW

- Extend the first JSON export foundation so it emits real `array -> MPPT`, `MPPT -> battery bank`, and `battery bank -> inverter` evaluations instead of provisional placeholders.
- Turn the React MVP notes into the first implementation slice: app shell, overview screen, and navigation.
- Replace the `Calculations coming in Step 4` placeholder in [`src/calc/runner.ts`](./src/calc/runner.ts) with the first real calculation pipeline for array, MPPT, battery-bank, and monthly-balance outputs.
- Connect the `ogos run` command to actual result generation and write the output report file.
- Finish validation coverage for calculation-critical fields and edge cases, then keep the tests aligned with the validator.

## NEXT

- Align the project data with the intended baseline in [`PROJECT_BASELINE.md`](./PROJECT_BASELINE.md), including black panels on `flat-ne` and `ne` and red panels on the other roof faces.
- Define and implement the first digital twin schema slice for PV-side topology and battery-bank linkage when the current design is stable enough to encode.
- Implement the report rendering flow so `report.md` contains a useful summary of inputs, validation results, and calculated outputs.
- Add the remaining input flows and CRUD coverage for any schema tables that are still read-only from the CLI.
- Tighten seed data and schema migration checks so database setup stays repeatable across fresh and existing projects.

## LATER

- Add richer downstream AC-side modeling for branch circuits, consumers, and generator scenarios in the React app and export layer.
- Add import and export support for project data.
- Improve the CLI experience with richer summaries, navigation shortcuts, and clearer status reporting.
- Review packaging and distribution so the command-line entrypoint stays easy to install and run.
