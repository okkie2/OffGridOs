# Verdict And Cost Summary Pages

This note defines two read-only summary pages for OffGridOS.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

The app should add two compact summary pages:

1. a `Verdict summary` page for technical fit
2. a `Cost summary` page for cost visibility

Both pages should stay simpler than the detail pages.
They should summarize, not replace, the existing subsystem screens.

## Page 1: Verdict summary

### Goal

Answer:

- is the current configuration technically coherent
- which selected components are underutilized, fully utilized, optimal, or outside limits

### Route

- `verdict-summary`

### Navigation

Place this page under `Reports`, alongside the other report page.

### Layout

Keep the page mostly table-based and read-only.

Suggested structure:

1. header
2. top status strip
3. surface verdicts table
4. battery bank verdict card
5. inverter verdict card

### Header

Title:

- `Verdict summary`

Subtitle:

- `Technical fit across the currently selected surfaces, battery bank, and inverter.`

### Top status strip

Show short state chips for:

- `Surface verdicts`
- `Project battery verdict`
- `Project inverter verdict`

The chips may show values such as:

- `Mixed`
- `Optimal`
- `Fully utilized`
- `Underutilized`
- `Outside limits`
- `Not evaluated`

### Surface verdicts table

Purpose:

- one row per surface
- show the selected panel type, selected MPPT, verdict, and explanation

Columns:

- `Surface`
- `Selected panel`
- `Selected MPPT`
- `Verdict`
- `Why`

Empty state:

- `No configured surfaces are available yet.`

Recommended verdict phrases:

- `Array well matched to MPPT`
- `Array fully utilized for MPPT`
- `MPPT underutilized by array`
- `Array clipping at MPPT`
- `Array outside MPPT limits`

### Project battery verdict card

Purpose:

- summarize the current project-level battery-bank verdict based on all configured surfaces combined

Fields:

- `Selected battery type`
- `Configured PV total across all surfaces`
- `Verdict`
- `Why`

Action:

- `Open Battery bank`

Empty state:

- `Choose a battery type before this verdict can be evaluated.`

Note:

- The battery bank is a project-level result. It is not matched against one surface at a time.

### Project inverter verdict card

Purpose:

- summarize the current `battery bank -> inverter` verdict

Fields:

- `Selected inverter`
- `Verdict`
- `Why`

Action:

- `Open Storage`

Empty state:

- `Choose an inverter before this verdict can be evaluated.`

### Footer note

- `Verdicts reflect the currently saved configuration.`

## Page 2: Cost summary

### Goal

Answer:

- what does the currently selected configuration cost
- how much cost sits on each surface
- what is the battery bank cost
- what is the inverter cost

### Route

- `cost-summary`

### Navigation

Place this page under `Reports`, alongside the other report page.

### Layout

Keep the page mostly table-based and read-only.

Suggested structure:

1. header
2. subtotal breakdown card
3. surface costs table
4. battery bank cost card
5. inverter cost card
6. pricing assumptions note

### Header

Title:

- `Cost summary`

Subtitle:

- `Estimated equipment cost for the currently selected surfaces, battery bank, and inverter.`

### Subtotal breakdown card

Show these subtotals:

- `Panels`
- `Battery bank`
- `Inverter`
- `Materials`
- `Work`
- `Total`

Supporting note:

- `Sum of the subtotals above, based on catalog prices in the current saved configuration.`

Notes:

- `Materials` and `Work` are placeholder subtotals and should render as `0` for now.
- The surface costs table still shows the per-surface MPPT costs in the detailed breakdown below.

### Surface costs table

Purpose:

- show the cost contribution per surface, split into panel and MPPT rows

Columns:

- `Surface`
- `Item`
- `Price / unit`
- `Amount`
- `Total`

Empty state:

- `No priced surfaces are available yet.`

Recommended cell wording:

- `Included with inverter`
- `Unknown`
- `No price set`

Footer:

- `Grand total`

Note:

- Each surface should render as two rows, one for the panel line and one for the MPPT line.
- The footer grand total should sum the surface totals.

### Battery bank cost card

Fields:

- `Selected battery type`
- `Unit price`
- `Quantity`
- `Battery bank total`

Empty state:

- `Choose a battery type to calculate battery bank cost.`

### Inverter cost card

Fields:

- `Selected inverter`
- `Inverter total`
- `Matching MPPTs included`

### RS allowance rule

Use this rule for RS inverter pricing:

- if the selected inverter is an RS inverter
- and a selected MPPT has the same product identity as that RS inverter
- then up to 2 matching MPPTs are included at `0`
- any additional matching MPPTs are charged normally
- non-matching MPPTs are charged normally

This should be shown explicitly in the page copy.

Suggested note:

- `Matching RS MPPTs with the same product identity as the selected RS inverter are included, up to 2 trackers.`

### Pricing assumptions

Show a short note block with:

- `Prices come from the catalog entries.`
- `Items without a price are shown as unknown, not zero.`
- `Integrated RS MPPT allowance applies only to matching RS MPPTs.`

## Simplification rules

Keep both pages:

- read-only
- table-first
- short on prose
- explicit about assumptions

Do not add editing controls to these pages.
Do not hide the RS allowance rule in a tooltip only.
Do not mix price math with technical verdict logic.
