# Project Baseline

This note captures the current project-specific baseline for the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The repository now contains both:

- a general digital twin design direction
- a specific real-world project baseline

This note records the current project baseline so later design and implementation work can distinguish:

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

The current database uses one panel type across all roof faces:

- `canadian-bihiku6-rood`

## Intended project direction

The intended near-term setup is more specific than the current database contents:

- the `flat-ne` roof face should use black panels
- the `ne` roof face should use black panels
- the `nw` roof face should use red panels
- the `se` roof face should use red panels
- the `sw` roof face should use red panels

This means the current `project.db` does not yet fully reflect the intended panel selection by roof face.

The current panel catalog already contains likely candidate panel types for this split, including:

- black: `aiko-475-all-black`
- red: `canadian-bihiku6-rood`
- red: `ja-deepblue-3-rood`
- red: `trina-vertex-s-plus-rood`

Using the current catalog prices, the best red candidate by `Wp/price` is:

- `canadian-bihiku6-rood`

The current explicit black candidate:

- `aiko-475-all-black`

does not yet have a stored price in the database, so a fair `Wp/price` comparison for black panels is not yet possible from the current data alone.

## Interpretation

At the moment:

- roof-face geometry is already modeled
- panel counts per roof face are already modeled
- panel color and panel model differentiation per roof face is not yet fully modeled in the current project data

So later implementation work should treat the current DB state as:

- a useful baseline
- but not yet the final intended project configuration

## Recommendation

When the project moves from design work into implementation, one of the first project-data updates should be:

- encode the intended black-panel choice for `flat-ne`
- encode the intended black-panel choice for `ne`
- keep or encode the intended red-panel choice for `nw`
- keep or encode the intended red-panel choice for `se`
- keep or encode the intended red-panel choice for `sw`

This can be done either by:

- selecting the intended black `panel_type` once black-panel pricing is available
- selecting `canadian-bihiku6-rood` for the red roof faces based on the current `Wp/price` comparison
- or adding a new black `panel_type` if the intended model is not yet present
