# Multilingual UI Plan

## Goal

Make the web UI available in:

- English (`en`)
- Dutch (`nl`)
- Frisian (`fy`)

while keeping the BDD regression suite English-only.

## Scope

This plan covers the React web UI, including:

- menu labels
- page titles and section headings
- form labels
- placeholders
- button labels
- save and error messages
- evaluation text and verdict labels
- empty states

This plan does not require:

- multilingual BDD scenarios
- multilingual route names
- multilingual database content entered by users

## Current Situation

- The UI text is mostly hardcoded in [web/src/App.tsx](/Users/joostokkinga/Code/OffGridOS/web/src/App.tsx).
- There is no current i18n framework or translation layer.
- The main frontend file is large, so string extraction will be the largest part of the work.
- BDD tests currently assert English UI text. We will keep that by forcing the BDD app runtime to English.

## Recommended Approach

Use a lightweight frontend translation setup with:

- one translation dictionary per language
- a small `t()` helper or hook
- a language context/provider
- a persisted language preference in `localStorage`

Recommended language codes:

- `en`
- `nl`
- `fy`

Recommended behavior:

- default to `en`
- allow switching language from the UI
- remember the chosen language on reload

## Design Decisions

### 1. Keep routes stable

Do not translate route fragments like `#/location` or `#/battery-array`.

Reason:

- simpler implementation
- no routing regressions
- BDD can stay stable
- existing bookmarks keep working

### 2. Keep user-entered content untranslated

Do not translate:

- project titles
- location titles
- notes
- descriptions entered by users

Only translate system UI text.

### 3. Keep BDD English-only

The BDD test environment should force the app language to `en`.

Reason:

- avoids rewriting step definitions around multiple languages
- keeps selectors and assertions stable
- allows multilingual UI without multilingual test maintenance

### 4. Start with frontend-only i18n

Translate visible frontend text first, even if some server messages remain English initially.

Reason:

- most of the visible text surface is already in the frontend
- this gives the biggest user-facing value fastest

## Implementation Phases

## Phase 1: Foundation

Create the i18n infrastructure.

Tasks:

- add translation dictionaries for `en`, `nl`, and `fy`
- add a language provider/context
- add a `t(key)` lookup function
- add `localStorage` persistence for selected language
- add a simple language switcher in the UI
- set English as the fallback language

Deliverable:

- app can switch language globally
- untranslated keys fall back to English

Estimated effort:

- 0.5 to 1 day

## Phase 2: Core Navigation and Shared UI

Translate the most visible shared UI first.

Tasks:

- sidebar menu
- breadcrumbs
- common buttons like `Save`, `Delete`, `Detail`, `Open`
- common save/error states
- common verdict labels like `Within limits` and `Outside limits`

Deliverable:

- shared UI shell is multilingual

Estimated effort:

- 0.5 to 1 day

## Phase 3: Main User Pages

Translate the main workflow pages in order of user importance.

Recommended order:

1. Location
2. Surface detail
3. Solar yield
4. Battery array
5. Inverter array

Tasks per page:

- headings
- section intros
- form labels
- placeholders
- info text
- empty states
- validation messages
- result cards and evaluation copy

Deliverable:

- the main planning flow is multilingual

Estimated effort:

- 1.5 to 2.5 days

## Phase 4: Catalog Pages

Translate the CRUD catalog pages.

Pages:

- Panel types
- MPPT types
- Battery types
- Inverter types

Tasks:

- form labels
- validation messages
- save/delete messages
- list headings and editor headings

Deliverable:

- maintenance/admin screens are multilingual too

Estimated effort:

- 0.5 to 1 day

## Phase 5: Test Stabilization

Keep BDD English-only and resilient.

Tasks:

- force language to `en` in the BDD app environment
- keep existing English assertions where practical
- prefer stable selectors over visible text for any newly added tests where useful

Deliverable:

- multilingual UI with stable English regression coverage

Estimated effort:

- 0.5 day

## Estimated Total Effort

Lean version:

- about 2 to 3 days

Solid production-ready version:

- about 3 to 5 days

Cleaned-up version with extra refactoring:

- about 5 to 7 days

## Risks

### 1. Large string surface

Because [web/src/App.tsx](/Users/joostokkinga/Code/OffGridOS/web/src/App.tsx) contains most of the UI, many strings must be extracted manually.

Risk:

- missed strings
- inconsistent key naming

Mitigation:

- translate page by page
- use a consistent key structure like `location.title`, `surface.panel.save`, `battery.evaluation.within_limits`

### 2. Logic-generated text

Some copy is produced by helper functions and evaluation logic.

Risk:

- easy to miss because it is not visible in JSX

Mitigation:

- search for all returned strings and all `set...Message` / `set...Error` calls

### 3. Future maintainability

If translations are added without structure, the app will become harder to maintain.

Mitigation:

- centralize dictionaries
- keep keys predictable
- avoid inline ad hoc translation objects inside page components

## Recommended File Structure

One reasonable starting structure:

```text
web/src/i18n/
  index.ts
  provider.tsx
  translations/
    en.ts
    nl.ts
    fy.ts
```

Optional later refinement:

- split translations by domain or page if files grow too large

## Translation Key Style

Use stable semantic keys, not English text as keys.

Good examples:

- `nav.location`
- `nav.solar_yield`
- `location.start_information`
- `location.notes_label`
- `surface.panel_array.title`
- `battery.evaluation.outside_limits`

Avoid:

- raw English sentence keys
- keys tied to layout position

## Verification Strategy

Minimum verification after each phase:

- `npm run build`
- `npm run bdd`

Manual checks:

- language switch persists after reload
- all major pages render in `en`, `nl`, and `fy`
- no missing key placeholders are visible
- BDD still runs in English

## Recommendation

The most sensible path is:

1. implement the i18n foundation
2. translate shared UI and main workflow pages first
3. keep BDD fixed to English
4. translate admin/catalog screens after the main workflow is stable

This gives the best balance between user value, technical safety, and implementation effort.
