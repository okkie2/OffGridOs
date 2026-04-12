# MVP Readiness Checklist

This note defines the readiness checklist for starting the first React MVP implementation.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Purpose

The repository now contains:

- design notes
- data-shape notes
- export-planning notes
- screen and navigation notes

This checklist defines when the project is ready to move from design into real implementation work.

## Ready to implement when

Implementation can begin when the following conditions are satisfied or consciously accepted as provisional.

## 1. Vocabulary is stable enough

Check:

- `array` is accepted as the MPPT-fed PV grouping
- `branch circuit` is accepted as the protected downstream group
- `consumer` is accepted as a load item that may be individual or grouped
- `electrical_status` and `fit_status` are accepted as the shared relationship-evaluation model

Reference:

- [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md)

## 2. MVP scope is stable enough

Check:

- overview is in scope
- roof-face / array / MPPT is in scope
- battery / inverter is in scope
- monthly balance is in scope
- downstream AC-side detail is not required for the first build

Reference:

- [REACT_MVP_SCOPE.md](./REACT_MVP_SCOPE.md)

## 3. Export contract is stable enough

Check:

- top-level JSON structure is accepted
- minimum entity sections are known
- minimum relationship sections are known
- minimum derived sections are known

Reference:

- [JSON_EXPORT_SHAPE.md](./JSON_EXPORT_SHAPE.md)

## 4. First project baseline is clear enough

Check:

- current roof faces are known
- current panel counts per roof face are known
- intended black/red roof-face split is documented
- any remaining pricing gaps are explicitly acknowledged

Reference:

- [PROJECT_BASELINE.md](./PROJECT_BASELINE.md)

## 5. First implementation order is clear enough

Check:

- export foundation tasks are sequenced
- frontend shell tasks are sequenced
- the app shell does not depend on full schema expansion

References:

- [EXPORT_BUILDER_TASKS.md](./EXPORT_BUILDER_TASKS.md)
- [FRONTEND_SHELL_TASKS.md](./FRONTEND_SHELL_TASKS.md)
- [REACT_MVP_IMPLEMENTATION_PLAN.md](./REACT_MVP_IMPLEMENTATION_PLAN.md)

## 6. Known provisional areas are accepted

These do not need to be solved before implementation starts, as long as they are acknowledged:

- explicit persisted `arrays` do not yet exist in SQLite
- explicit persisted `project_mppts` do not yet exist in SQLite
- black-panel `Wp/price` comparison is incomplete because current pricing is missing
- downstream AC-side modeling may remain partial in the first MVP

## 7. First coding stop point is accepted

Implementation should stop and review once these are working:

- export entrypoint exists
- one JSON file can be written
- overview screen loads from export
- one roof-face detail screen loads from export

This is the first checkpoint before deeper implementation.

## Recommendation

The project is now ready for implementation if you are comfortable treating the remaining gaps as provisional rather than blockers.

If not, the next design work should focus only on the unresolved provisional items instead of expanding the design surface further.

