# OffGridOS App UI Kit

High-fidelity recreation of the OffGridOS web app — a single-page React application for off-grid solar system design.

## Design Language

- **Dark sidebar** (`#0b1326`) + **light main area** (`#f5f7fa`)
- **Inter** typeface throughout
- Brand accent: **#00ffc2** (mint) in sidebar, **#00c9a0** (teal) in main area
- All caps + letter-spacing for nav labels, section heads, stat labels
- Square (0px radius) status badges
- Minimal transitions: 120–180ms ease, press = `translateY(1px)`

## Structure

```
index.html          — Main interactive prototype (Location + Production screens)
Sidebar.jsx         — Sidebar navigation component
StatusBadge.jsx     — Status/fit badge + verdict card
Panel.jsx           — Panel, SummaryCard, SectionHead, EmptyState
SurfaceCard.jsx     — Per-surface card with mini stats
ChainRow.jsx        — System chain + relationship status strip
ProductionPage.jsx  — Production overview page
LocationPage.jsx    — Location detail page
StoragePage.jsx     — Battery bank / storage page
```

## Navigation flow

1. **Location** — site info, coordinates, photo upload
2. **Production** — surface list, monthly yield, chain overview
3. **Storage** — battery bank config + evaluation
4. **Consumption** — converters, load circuits, loads
5. **Reports** — monthly balance, verdict summary, cost
6. **Catalogs** — panel types, MPPTs, batteries, etc.

## Usage

Open `index.html` in a browser. Click sidebar items to navigate between screens. The prototype covers Location, Production, Surface detail, Storage, and Reports screens.

## Notes

- This is a cosmetic/interaction prototype — no live API calls
- Data is mocked to match the `18Mad Boerderij` project baseline
- All icons are loaded from `../../assets/icons/`
