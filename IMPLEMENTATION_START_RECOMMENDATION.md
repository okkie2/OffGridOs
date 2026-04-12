# Implementation Start Recommendation

This note summarizes whether the OffGridOS digital twin is ready to move from design work into the first implementation slice.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](./UBIQUITOUS_LANGUAGE.md).

## Recommendation

The project is ready to start the first implementation slice.

The remaining gaps are real, but they are now narrow enough to treat as provisional implementation constraints rather than blockers.

## Why implementation can start now

The following are already strong enough:

- terminology
- relationship evaluation model
- project baseline
- export shape
- screen set
- app navigation
- MVP scope
- export and frontend task sequencing

This is enough structure to begin with a small coding slice without inventing the product while building it.

## What the first implementation slice should be

The first coding slice should stop after:

1. a JSON export entrypoint exists
2. one JSON file can be written from current project data
3. the React shell can load that file
4. the overview screen renders
5. one roof-face detail route renders

This is the right first checkpoint.

## What should remain provisional

Do not block the first implementation slice on:

- final persisted `arrays` schema
- final persisted `project_mppts` schema
- black-panel price completion
- full downstream AC-side data
- full generator modeling

These can be bridged or deferred as long as the app and export are honest about what is provisional.

## First implementation success criteria

The first slice should be considered successful when:

- the export is structurally stable
- IDs are consistent
- the overview explains the system clearly
- one roof-face / array / MPPT drill-down works
- the codebase is ready for the next slice rather than overbuilt

## Suggested next mode

The project can now shift from:

- design expansion

to:

- implementation prep and code changes

The best next practical step is:

- implement the export entrypoint and write the first static `digital-twin.json`

## Model recommendation

For this point in the work:

- the hard conceptual design is mostly settled
- the next work becomes more structural and implementation-oriented

So this is a reasonable point to consider scaling down from `GPT-5.4 medium` to `GPT-5.4 mini medium` for straightforward execution work, as long as any new tricky modeling decisions can still be escalated when needed.

