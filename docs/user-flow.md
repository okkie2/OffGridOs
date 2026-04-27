# User Flow

This note captures a user-authored screen and flow overview for the OffGridOS app.

Terminology in this note should follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).



## Location

### Input (CRUD)

- Title
- Description
- Coordinates
- Location image
- Notes field
- List of surfaces

### Evaluation

The `Location` section is a strong top-level entry because it keeps shared site context and the surface collection together.

What works well:

- It clearly separates shared site information from per-surface detail.
- It acknowledges that one location may contain multiple surfaces.
- It gives the user one obvious place to start before drilling into PV configuration.

What is still missing or unclear:

- `Coordinates` should be explicit about latitude and longitude.
- `List of surfaces` is an output or collection area, not just an input. It should support create, review, edit, delete, and drill-down into one surface.
- The relation between `Location` and `Solar yield` is not stated here, even though yield depends on the location plus all configured surfaces.
- If `Title` and `Description` are kept, it is worth deciding whether they are user-facing labels, internal project labels, or documentation fields.

Recommendation:

- Keep `Location` responsible for shared site context.
- Treat `List of surfaces` as a managed collection with create/delete/open-detail actions.
- Make `Latitude` and `Longitude` explicit fields.
- Clarify that `Solar yield` is derived from `Location` plus the configured surfaces, not from `Location` alone.

## Surface detail

Details for a single surface. One location may have many surfaces.

### About

#### Input (CRUD)

- Title
- Description
- Image
- Notes

### Surface geometry

#### Input (CRUD)

- Available area
- Tilt
- Azimuth

### Panel selection

#### Input (CRUD)

- Selected panel type from the catalog for this surface
- Amount of panels

#### Output

- Electrical details of panel

### Panel array selection

#### Input (CRUD)

- Preferred panels per string
- Preferred number of parallel strings

#### Output

- Electrical details of the panel array

### MPPT selection

#### Input

- Preferred MPPT selection

#### Output

- Electrical details of the MPPT

### Panel array - MPPT evaluation

#### Output

- Verdict with color coding
- Verdict explanation
- Electrical details / flagged electrical details

## Solar yield

Solar yield is the sum of all surfaces.

#### Output

- Table
- Row for each surface
- Columns with yield details including verdict
- Row with totals at the bottom
- Table
- Columns for each month of the year
- Rows with expected yield details
- Last row has average daily yield total for that month

## Battery bank

### About

#### Input (CRUD)

- Title
- Description
- Image
- Notes

### Battery selection

#### Input (CRUD)

- Preferred system voltage
- Selected battery type
- Amount of batteries

### Battery array

#### Input (CRUD)

- Preferred batteries per string
- Preferred number of parallel strings

#### Output

- Electrical details of the battery array

### Solar yield - Battery bank evaluation

#### Output

- Verdict with color coding
- Verdict explanation
- Electrical details / flagged electrical details

### Battery capacity

#### Output

- Electrical details
- Table
- Columns for each month of the year
- Rows with expected yields per day
- Rows with expected consumption per day
- Last row has average days to charge from 20% to 80%

## Inverter

### About

#### Input (CRUD)

- Title
- Description
- Image
- Notes

### Inverter selection

#### Input (CRUD)

- Selected inverter

### Battery - Inverter evaluation

#### Output

- Verdict with color coding
- Verdict explanation
- Electrical details

## Loads

#### Input

- List of loads
- Per load: title, description, peak load in watts, expectation of kWh/day
- Summary of electrical details

### Inverter - Loads evaluation

#### Output

- Verdict on loads-inverter combination with color coding
- Verdict explanation
  - Electrical details
