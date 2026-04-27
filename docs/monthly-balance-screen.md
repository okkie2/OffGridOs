# Monthly Balance Screen

This note defines the monthly balance screen for the OffGridOS digital twin.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

This screen should show how the whole system behaves over the year.

It should help the user answer:

- which months are strong or weak
- where surplus occurs
- where deficit occurs
- how much the battery bank is pressured
- where generator support becomes important
- whether seasonal trade-offs are acceptable

This is the main seasonal system view.

## Screen scope

This screen should combine:

- solar contribution
- load demand
- battery charge and discharge pressure
- generator contribution
- monthly surplus or deficit

It is the place where upstream and downstream choices meet in one view.

## Layout blocks

Suggested layout:

1. yearly summary header
2. 12-month balance chart
3. monthly detail table
4. weakest-month section
5. strongest-month section
6. seasonal interpretation panel
7. adjustment options section

## 1. Yearly summary header

Show:

- total yearly solar yield
- total yearly load demand
- total yearly surplus
- total yearly deficit
- worst month
- best month

Purpose:

- give the user a quick overview before diving into month-by-month detail

## 2. 12-month balance chart

This should be the main visual element.

Show per month:

- solar contribution
- demand
- surplus or deficit
- optional generator contribution

A stacked or layered chart is likely the most useful first version.

The weakest and strongest months should be visually highlighted.

## 3. Monthly detail table

Each month should have a compact row with:

- month
- solar kWh
- load kWh
- generator kWh
- battery charge kWh
- battery discharge kWh
- surplus kWh
- deficit kWh
- notes

This gives the user precise numbers behind the chart.

## 4. Weakest-month section

Show a dedicated summary for the weakest month.

Useful fields:

- month name
- deficit magnitude
- storage pressure
- generator dependence
- suggested interpretation

This section is especially important for off-grid configuration decisions.

## 5. Strongest-month section

Show a dedicated summary for the strongest month.

Useful fields:

- month name
- surplus magnitude
- clipping or underutilization notes
- excess solar context

This helps the user understand whether excess summer production is acceptable or wasteful.

## 6. Seasonal interpretation panel

This section should provide interpretive guidance, not just numbers.

Examples:

- `Winter deficit is the main system constraint`
- `Summer clipping is acceptable given winter benefit`
- `Battery bank pressure is concentrated in November to January`
- `Generator dependence is limited to two weak months`

This should help the user reason about trade-offs.

## 7. Adjustment options section

Suggested actions:

- `Increase array size`
- `Increase battery capacity`
- `Reduce winter demand`
- `Accept seasonal generator support`
- `Review inverter and load-circuit pressure`

The point is not to auto-change the configuration, but to show likely levers.

## Key questions this screen should answer

The user should quickly be able to answer:

- What is my weakest month?
- How bad is the worst deficit?
- Is summer clipping acceptable?
- Do I need more battery capacity?
- Do I need more PV input?
- Can I accept generator use in a few months?

## Relationship to the other screens

This screen should be fed by:

- surface and array data
- MPPT fit evaluations
- battery-bank and inverter relationships
- load-circuit and load demand assumptions

It is the place where the whole digital twin becomes operationally meaningful.

## Recommendation

The first implemented version of this screen should prioritize:

1. yearly summary
2. 12-month chart
3. monthly detail rows
4. weakest-month interpretation
5. strongest-month interpretation

That is enough to make seasonal behavior visible and actionable.
