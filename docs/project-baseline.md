# Project Baseline

This note captures the current project-specific baseline for the `OffGridOS - 18Mad Boerderij` project within the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

The repository now contains both:

- a general digital twin architecture direction
- a specific real-world project baseline for `OffGridOS - 18Mad Boerderij`

This note records the current project baseline so later configuration and implementation work can distinguish:

- what is already encoded in `project.db`
- what is intended next but not yet encoded

## Current baseline from `project.db`

The current database already defines five roof faces:

- `flat-ne`
- `ne`
- `nw`
- `se`
- `sw`

The current panel-count assignment in the database is:

- `flat-ne`: `4`
- `ne`: `2`
- `nw`: `7`
- `se`: `4`
- `sw`: `2`

The current database now uses the intended split panel types across the roof faces:

- black: `aiko-475-all-black` on `flat-ne` and `ne`
- red: `canadian-bihiku6-rood` on `nw`, `se`, and `sw`

## Interpretation

The current `project.db` now reflects the intended panel configuration by roof face.

The current panel catalog still contains the likely candidate panel types for this split, including:

- black: `aiko-475-all-black`
- red: `canadian-bihiku6-rood`
- red: `ja-deepblue-3-rood`
- red: `trina-vertex-s-plus-rood`

Using the current catalog prices, the best red candidate by `Wp/price` is:

- `canadian-bihiku6-rood`

The current explicit black candidate:

- `aiko-475-all-black`

does not yet have a stored price in the database, so a fair `Wp/price` comparison for black panels is not yet possible from the current data alone.

## Next refinements

The baseline split is now aligned, so future project-data work should focus on:

- keeping the shared location coordinates up to date when the real site measurement is known
- refining panel pricing or model metadata if a better black-panel comparison becomes available
- expanding the remaining persisted project data for arrays, MPPTs, battery-bank configuration, and inverter configuration
