# Monthly Usage Model

This note defines a practical first model for monthly and usage variation in the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

The digital twin should be adjustable per month without becoming too complex too early.

This note defines:

- what a simple monthly model should capture
- where monthly factors are enough
- where richer usage patterns may be needed later

## Recommendation

Start with a two-layer usage model:

1. a simple base load definition per `consumer`
2. a monthly factor layer that adjusts it per month

This is enough for the first useful version.

## Base consumer model

Each `consumer` should have a base definition such as:

- `nominal_power_w`
- `surge_power_w`
- `daily_energy_kwh`
- optional notes about expected usage

This base definition represents the normal load assumption before seasonal adjustments.

## Monthly adjustment model

Use one row per `consumer` per month with:

- `month`
- `energy_factor`
- optional notes

Examples:

- pond pump: higher in summer
- electric heating load: higher in winter
- fridge: nearly stable all year
- living room sockets: modest seasonal change

This keeps the model readable while allowing meaningful month-by-month variation.

## When monthly factors are enough

Monthly factors are a good first fit for:

- lighting groups with seasonal variation
- pumps with seasonal duty changes
- appliance groups with rough monthly changes
- room or socket-group estimates
- generator availability assumptions
- solar variation assumptions

## What monthly factors do not capture well

Monthly factors are weaker for:

- narrow daily runtime windows
- alternating duty cycles during the day
- short high-surge devices
- consumers whose power and energy profile differ sharply
- loads driven by weather events rather than broad seasons

These should not block the first version.

## Future usage-profile layer

If needed later, add an optional usage-profile layer on top of the monthly model.

Possible future fields:

- `usage_pattern`
- `hours_per_day`
- `days_per_week`
- `seasonal_only`
- `preferred_time_window`
- `runtime_hours`

This should be a later refinement, not part of the first required model.

## Suggested first-phase rule

For the first useful digital twin:

- treat `daily_energy_kwh` as the main consumer-energy input
- use `nominal_power_w` and `surge_power_w` for electrical compatibility checks
- use monthly `energy_factor` to scale the energy side per month

This gives a clean split:

- power fields help evaluate wiring, inverter, and branch-circuit relationships
- energy fields help evaluate monthly balance, battery pressure, and seasonal deficits

## Example interpretations

### Washing machine

- base `daily_energy_kwh`: low to moderate
- `nominal_power_w`: moderate
- `surge_power_w`: modest
- monthly factor: usually near flat

### Pump

- base `daily_energy_kwh`: potentially high
- `nominal_power_w`: steady
- monthly factor: can vary strongly by season

### Living room sockets

- modeled as one grouped `consumer`
- `daily_energy_kwh`: aggregated estimate
- monthly factor: moderate winter increase may be acceptable

### Oven

- base `daily_energy_kwh`: lower average, but not constant
- `nominal_power_w`: high
- `surge_power_w`: optional
- monthly factor: may stay mostly flat

## Generator and solar

The same monthly idea works for:

- `generator` availability
- solar availability or yield assumptions

This keeps the whole twin aligned around month-based scenario values.

## Recommendation

Do not introduce hourly simulation yet.

The first version should use:

- base consumer definitions
- monthly scaling factors
- clear separation between power checks and energy checks

That will be enough to make the digital twin useful without overcomplicating the design.

