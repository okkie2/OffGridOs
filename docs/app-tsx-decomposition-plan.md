# App.tsx Decomposition Plan

## Baseline

```bash
echo "Lines: $(wc -l < web/src/App.tsx) | Functions: $(grep -c '^function ' web/src/App.tsx)"
# Lines: 12074 | Functions: 135
```

## Invariant

Each slice = one commit. Before committing each slice:

```bash
npx tsc --noEmit && npm run bdd
```

Both must pass. Never skip this. Measure App.tsx before and after with the command above.

## Target

App.tsx below 500 lines (app shell + entry point only).

---

## Slice 1 — Formatters

**New file:** `web/src/formatters.ts`

**Extract:** all `format*` functions — `formatPowerW`, `formatCurrentA`, `formatEnergyKwh`, `formatVoltage`, `formatKw`, `formatKwh`, `formatAmps`, `formatVolts`, `formatCurrency`, `formatPriceSourceName`, `renderPrice`, `formatDailyYield`, `formatWholeKwh`, `formatBrandModel`, `formatWp`

**Risk:** zero — pure functions operating only on primitives, no type deps, no React.

**Expected App.tsx lines after:** ~11,850

---

## Slice 2 — Load domain

**New file:** `web/src/load-domain.ts`

**Extract:** `loadNominalPowerW`, `loadSurgePowerW`, `loadStandbyPowerW`, `loadNominalCurrentA`, `loadDailyEnergyKwh`, `loadCircuitVoltageV`, `loadCircuitSupplyType`, `emptyLoadCircuitDraft`, `loadCircuitDraftFromEntity`, `emptyLoadDraft`, `loadDraftFromEntity`, `loadDraftFromPreset`

Move the `Load`, `LoadCircuit`, `LoadDraft`, `LoadCircuitDraft`, `LoadPreset`, `ConversionDevice` types that these functions exclusively own. All other callers in App.tsx import them from this file.

**Risk:** low — pure transforms and calculations, TypeScript compiler enforces correctness.

**Expected App.tsx lines after:** ~11,600

---

## Slice 3 — Entity drafts

**New file:** `web/src/drafts.ts`

**Extract:** `emptyBatteryDraft`, `batteryDraftFromType`, `emptyPanelDraft`, `panelDraftFromType`, `emptyCabinetDraft`, `cabinetDraftFromType`, `emptyMpptDraft`, `mpptDraftFromType`, `emptyInverterDraft`, `inverterDraftFromType`, `emptyConversionDeviceDraft`, `conversionDeviceDraftFromType`

Move the draft types (`BatteryTypeDraft`, `PanelTypeDraft`, etc.) alongside.

**Risk:** zero — pure data transforms, no logic.

**Expected App.tsx lines after:** ~11,350

---

## Slice 4 — Physics and yield

**New file:** `web/src/physics.ts`

**Extract:** `angularDifferenceDeg`, `estimateFaceYieldTable`, `estimateFaceYieldForMonth`, `findWeakestMonth`, `findStrongestMonth`, `summarizeMonthlyBalance`, `formatPercent`, `formatSignedEnergyKwh`

Move `MonthlyBalanceRow` and any yield-specific types alongside.

**Risk:** zero — pure math, no React, no routing deps.

**Expected App.tsx lines after:** ~11,150

---

## Slice 5 — Evaluation logic

**New file:** `web/src/evaluation.ts`

**Extract:** `getFactorPairs`, `evaluateArrayConfiguration`, `evaluateMpptCompatibility`, `evaluateBatteryArrayConfiguration`, `buildBatteryVoltageOptions`, `evaluateBatteryArraySizing`, `evaluateBatteryRefillRule`, `getBatteryEvaluationCopy`, `getInverterEvaluationCopy`, `evaluateConverterBankCompatibility`, `evaluateInverterCompatibility`, `evaluateBatteryCapacityFit`, `getRelationshipVerdictSummary`, `getRelationshipVerdictLabel`, `explainRelationshipReason`, `buildRelationshipReasonList`, `isMatchingRsMppt`, `statusTone`, `verdictLabel`, `formatReasonFallback`

**Risk:** low — pure domain logic, heavily used by pages, but TypeScript will catch every missing import immediately.

**Expected App.tsx lines after:** ~10,475

---

## Slice 6 — Routing utilities

**New file:** `web/src/routing.ts`

**Extract:** `parseLegacyHashRoute`, `parseAppUrl`, `buildRoutePath`, `getCurrentPathContext`, `routeHref`

**Keep in App.tsx for now:** `navigateTo` — it writes `_currentLocationId` and dispatches `popstate`. Extracting it safely requires resolving the module-level state first (Slice 13).

Move the `Route`, `ParsedAppUrl`, and related routing types alongside.

**Risk:** low — URL parsers and builders are pure functions. Pages call `navigateTo` which stays put.

**Expected App.tsx lines after:** ~10,315

---

## Slice 7 — Shared UI atoms

**New file:** `web/src/components/ui.tsx`

**Extract:** `StatusBadge`, `SummaryCard`, `ConfirmDialog`

**Risk:** low — self-contained, no routing or state deps beyond props.

**Expected App.tsx lines after:** ~10,015

---

## Slice 8 — Media components

**New file:** `web/src/components/media.tsx`

**Extract:** `ImageLightboxContext`, `useImageLightbox`, `ExpandablePhoto`, `ImageLightbox`

The context must move with its hook and consumers. Both `ExpandablePhoto` and `ImageLightbox` are self-contained once the context moves.

**Risk:** medium — `ImageLightboxContext` is consumed in page components that still live in App.tsx. After extraction, App.tsx imports and re-provides it. Verify in the browser before committing.

**Expected App.tsx lines after:** ~9,665

---

## Slice 9 — Navigation shell components

**New file:** `web/src/components/nav.tsx`

**Extract:** `sidebarIcon`, `Sidebar`, `AppLanguageControl`, `getRouteTitle`, `getRouteContext`, `PageHeader`, `AppFrame`, `Breadcrumbs`

These call `navigateTo`. Since `navigateTo` is still in App.tsx at this stage, pass it as a prop or import it directly from App.tsx (temporary). Clean up in Slice 13 when `navigateTo` moves to `routing.ts`.

**Risk:** medium — layout shell touches routing, language switching, and project/location switchers. Test all three in the browser after extraction.

**Expected App.tsx lines after:** ~9,015

---

## Slice 10 — Catalog and report pages

Two new files, one commit each:

**`web/src/pages/catalogs.tsx`:** `CatalogsPage`, `CabinetCatalogPage`, `BatteryCatalogPage`, `PanelCatalogPage`, `MpptCatalogPage`, `InverterCatalogPage`, `ConversionDeviceCatalogPage`, `CatalogInlineEditorRow`

**`web/src/pages/reports.tsx`:** `AboutPage`, `ReportsPage`, `VerdictSummaryPage`, `CostSummaryPage`

**Risk:** medium — these pages call `navigateTo` and use evaluation logic from `evaluation.ts`. Verify each catalog page renders and saves data before committing.

**Expected App.tsx lines after:** ~6,515

---

## Slice 11 — Workbench pages (one sub-slice per page)

Extract one page per commit in this order (safest to riskiest):

| Sub-slice | File | Lines freed | Notes |
|---|---|---|---|
| 11a | `web/src/pages/ProductionPage.tsx` | ~290 | Reads state, no writes |
| 11b | `web/src/pages/ConsumptionPage.tsx` | ~700 | ConsumptionOverviewPage + ConsumptionPage |
| 11c | `web/src/pages/LocationPage.tsx` | ~365 | Reads location state |
| 11d | `web/src/pages/BatteryArrayPage.tsx` | ~700 | Heavy eval usage |
| 11e | `web/src/pages/ConverterDetailPage.tsx` | ~835 | Complex form |
| 11f | `web/src/pages/LoadsPage.tsx` | ~1,150 | LoadCircuitsPage + LoadsPage |
| 11g | `web/src/pages/SurfaceDetail.tsx` | ~833 | **Writes `_currentLocationId` at line 4359 — highest risk** |

For 11g: the `_currentLocationId` write in `SurfaceDetail` happens when a new location is created during surface setup. Before extracting this page, add a test that exercises the create-location flow, so any regression is caught immediately.

**Expected App.tsx lines after all 11 sub-slices:** ~1,400

---

## Slice 12 — InverterArrayPage removal

`InverterArrayPage` (line 5609, ~397 lines) is dead code — the `inverter-array` route renders `ConsumptionPage` instead. Delete it outright, do not extract it.

**Expected App.tsx lines after:** ~1,000

---

## Slice 13 — App shell cleanup

With all pages and components extracted, App.tsx is now only `AppContent` and `App`.

**Step 1:** Convert `_currentLocationId` and `_currentProjectId` from module-level `let` variables into a React context. This is the root cause of the BDD test isolation bug encountered during this session (module-level state persisted between scenarios).

**Step 2:** Move `navigateTo` to `web/src/routing.ts` now that it no longer needs to close over module-level variables.

**Step 3:** AppContent becomes a thin orchestrator — state management, data fetching, and route dispatch only.

**Risk:** high — touches every layer. Do not skip Slice 12 before attempting this. Run the full test suite and open every workbench page in the browser before committing.

**Expected App.tsx lines after:** ~400–500

---

## Progress tracker

Run after each slice to record progress:

```bash
echo "$(date +%Y-%m-%d) | Lines: $(wc -l < web/src/App.tsx) | Functions: $(grep -c '^function ' web/src/App.tsx)"
```

| Slice | Date | Lines | Functions |
|---|---|---|---|
| Baseline | 2026-05-04 | 12,074 | 135 |
| 1 — Formatters | | | |
| 2 — Load domain | | | |
| 3 — Entity drafts | | | |
| 4 — Physics/yield | | | |
| 5 — Evaluation logic | | | |
| 6 — Routing utilities | | | |
| 7 — UI atoms | | | |
| 8 — Media components | | | |
| 9 — Nav shell | | | |
| 10 — Catalog/report pages | | | |
| 11a–11g — Workbench pages | | | |
| 12 — Delete dead code | | | |
| 13 — App shell cleanup | | | |
| **Target** | | **< 500** | **< 5** |
