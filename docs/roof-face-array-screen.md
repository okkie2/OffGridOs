# Roof Face Array Screen

This note defines the detailed screen for one roof face, its array, and its MPPT relationship.

Terminology in this note must follow [UBIQUITOUS_LANGUAGE.md](../UBIQUITOUS_LANGUAGE.md).

## Purpose

After the project overview, this is likely the most important detailed screen in the React app.

It should help the user answer:

- what is installed on this roof face
- how is it grouped electrically
- which MPPT is selected
- is the `array -> MPPT` relationship sound
- what can be changed to improve it

## Screen scope

This screen focuses on one roof face and should show:

- roof face geometry
- panel assignment
- strings
- array
- selected MPPT
- `array -> MPPT` relationship evaluation
- month-by-month performance for this roof face or array

## Layout blocks

Suggested layout:

1. roof face header
2. panel and string section
3. array summary section
4. MPPT fit section
5. monthly performance section
6. adjustment options section

## 1. Roof face header

Show:

- roof face name
- orientation
- tilt
- usable area
- current panel type
- current panel count

Purpose:

- re-establish physical context

## 2. Panel and string section

Show:

- panel type details
- panel count
- string definitions
- string electrical state

Important values:

- string count
- panels per string
- string voltage
- string current
- string Wp

The user should be able to understand how the roof face panels are turned into electrical strings.

## 3. Array summary section

Show:

- array name
- strings included in the array
- derived array voltage
- derived array current
- derived array Wp

For the current project direction, this will often be one array per roof face.

## 4. MPPT fit section

This is the core of the screen.

Show:

- selected MPPT
- MPPT limits
- derived array input values
- `electrical_status`
- `fit_status`
- `reasons`

This section should make it very clear whether the selected MPPT is:

- within limits
- outside limits
- optimal
- acceptable
- clipping expected
- underutilized

It should also clearly state why.

## 5. Monthly performance section

Show a roof-face or array specific monthly view.

Suggested values:

- estimated monthly production
- best month
- weakest month
- seasonal notes

This helps the user understand why a configuration that clips in summer may still be valuable in winter.

## 6. Adjustment options section

This section should answer:

- what can the user change here
- what is the likely effect

Suggested adjustable inputs:

- panel type
- panel count
- string definition
- selected MPPT

Suggested explanation style:

- `Change MPPT`
- `Reduce panel count`
- `Rework string layout`
- `Accept seasonal clipping`

This is where the app supports the user’s “change upstream / inspect downstream” thinking.

## First interaction goal

The most important outcome of this screen is that the user can quickly answer:

- Is this roof face and array well matched to its MPPT?

And if not:

- Should I change the MPPT?
- Should I change the array?
- Is the current trade-off intentional and acceptable?

## Relationship emphasis

This screen should strongly emphasize the `array -> MPPT` relationship.

That means:

- status badges should be prominent
- key voltage/current/power values should be easy to scan
- reasons should be visible without digging through raw JSON

## Recommendation

The first implemented version of this screen should prioritize:

1. roof face facts
2. array electrical summary
3. MPPT fit evaluation
4. monthly performance
5. adjustment options

That is enough to make the screen useful without overloading it.
