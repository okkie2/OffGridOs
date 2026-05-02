# Digital Twin Model

This note describes the intended system model for OffGridOS as a digital twin of an off-grid electrical installation.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Goal

Model the system as connected components so a change in one part shows its effects in the rest of the system.

The app should support two directions:

1. Adjust upstream inputs and view results downstream.
2. Adjust downstream targets and view the impact or requirements upstream.

## Core idea

Treat the installation as a dependency graph, not as a flat form.

Every important relationship in that graph should be evaluated in two layers:

1. `electrical_status`: `within_limits` or `outside_limits`
2. `fit_status`: `optimal`, `fully_utilized`, `clipping_expected`, or `underutilized`

This distinction should apply wherever it helps explain both hard constraints and softer design trade-offs.

The graph should include:

- surfaces
- panel types
- panel count per surface
- strings per surface
- one or more arrays per surface
- one MPPT per array
- MPPTs
- battery bank
- inverter/charger
- load circuits
- loads
- generator
- wiring
- fuses

## Editable inputs

These are user-chosen inputs, not calculated outputs:

- panel type
- panel count per surface
- surface geometry
- surface orientation
- battery type
- battery count
- battery bank layout targets
- generator availability
- load definitions
- load profile
- cable lengths
- monthly variation inputs

## Derived design

These should normally be computed from the inputs and constraints:

- string layout
- arrays
- MPPT input fit
- battery output state
- battery charging behaviour
- inverter/charger loading
- relationship electrical status between connected components
- relationship fit status between connected components
- fuse suggestions
- wiring suggestions
- voltage drop and current stress
- monthly surplus or deficit
- autonomy margin
- bottlenecks and violated constraints

## Bidirectional workflow

The UI should make the two user intents explicit.

### Upstream to downstream

The user changes a design input such as:

- panel count on one surface
- battery count
- generator availability

The app then shows downstream consequences such as:

- changed string layout
- changed MPPT input fit
- changed battery charge behaviour
- changed monthly surplus
- changed fuse or wiring requirements

### Downstream to upstream

The user changes a target or desired outcome such as:

- more winter surplus
- more autonomy
- less generator dependence
- lower cable loss

The app should not silently rewrite the whole design.

Instead, it should show upstream implications such as:

- more panels needed on a specific surface
- a different array layout
- more battery units required
- a different MPPT or inverter class
- shorter cable runs or thicker wiring

This pattern should work across the whole chain, not only on the PV side:

- `array -> MPPT`
- `MPPT -> battery bank`
- `battery bank -> inverter`
- `inverter -> load circuit`
- `load circuit -> load`

## Monthly variation

The twin should be adjustable per month.

Use one base configuration plus monthly scenario values for:

- solar yield
- consumption
- generator usage
- availability assumptions
- seasonal efficiency adjustments if needed

This keeps the topology stable while allowing the energy balance to vary month by month.

## UI direction

The UI should help the user inspect cause and effect, not just edit fields.

For the current design direction:

- the general model may allow a surface to feed more than one array
- each array feeds one MPPT
- this project's current setup is `1:1`: one surface, one array, one MPPT
- the UI should make the current mapping obvious while leaving room for a future split-per-surface model

Useful views:

- system topology view
- surface and string view
- monthly balance view
- bottleneck view
- upstream/downstream impact panel

The important interaction is:

- select a component or target
- change it
- immediately see affected downstream results
- or see upstream requirements to satisfy the changed target

## Data shape direction

The React app reads from the Node server API. The server assembles and returns the digital twin payload from the SQLite database.

`digital-twin.json` is not the deployment boundary. It is a scratch artifact and should not be treated as durable application state.

The API payload should represent:

- component definitions
- relationships between components
- monthly scenario values
- derived result snapshots if precomputed

Use the terminology and concept boundaries from [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md) when defining these API response objects.

## Recommendation

Build this in layers:

1. Define the component graph and relationships.
2. Separate editable inputs from derived outputs.
3. Add monthly scenario support.
4. Add bidirectional impact views in the UI.
5. Add deeper optimisation logic later.
