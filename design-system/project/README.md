# OffGridOS Design System

## Overview

**OffGridOS** is a web app for end-to-end off-grid power system design. It guides solar installers, engineers, and off-grid property owners through the full design chain: from site location and solar surface modeling to battery bank sizing, inverter selection, and downstream load circuits. The product is positioned as a technical SaaS planner with a "digital twin" metaphor—every component in the system is modeled and evaluated against every adjacent component.

**Customers:** Solar installers and EPCs, energy consultants, off-grid property owners, NGOs, RV/marine upfitters.

**Core value proposition:** Replace scattered spreadsheets and specs with a guided, defensible design workflow that provides automated sizing, validation, and performance/cost reporting.

## Sources

- **Codebase:** `OffGridOS/` (mounted via File System Access API)
  - Main app: `OffGridOS/web/src/App.tsx` (10,236 lines — single-file React app)
  - Styles: `OffGridOS/web/src/styles.css` (2,046 lines)
  - Translations: `OffGridOS/web/src/i18n.tsx`
  - Docs: `OffGridOS/docs/` (extensive markdown specs)
- **Screenshots:** Several app screenshots in `OffGridOS/` root (screencapture-*.png)
- No Figma link provided.

---

## Product Structure

There is one product: **the OffGridOS web app**. It is a single-page React application with a persistent dark sidebar and light main content area. Navigation follows the energy flow:

```
Location → Production → Storage → Consumption → Reports → Catalogs
```

The full conceptual drill-down chain is:
```
Location → Surface → Array → MPPT → Battery Bank → Converter → Load Circuit → Load
```

### Key Sections
| Section | Purpose |
|---------|---------|
| **Location** | Site context, coordinates, site photo |
| **Production** | Surface collection, solar yield per surface/month |
| **Storage** | Battery bank sizing and fit evaluation |
| **Consumption** | Converters, load circuits, loads |
| **Reports** | Monthly balance, verdict summary, cost summary |
| **Catalogs** | Panels, MPPTs, batteries, inverters, converters, cabinets |

---

## CONTENT FUNDAMENTALS

### Tone
**Technical, calm, precise.** OffGridOS speaks like a knowledgeable engineer, not a startup. There is no hype, no exclamation marks, no encouragement. The product assumes the user is competent.

### Voice
- **Third person for system verdicts:** "This array is closely matched to the selected MPPT."
- **Imperative for actions:** "Save", "Delete", "Open", "Add surface"
- **No first person** ("I/we") in the UI. No second person ("You") either — the app just states facts.
- **No filler copy.** Every string earns its place.

### Casing
- **Nav labels:** Title Case for top-level sections (`Location`, `Production`, `Storage`), Title Case for sub-items (`Panels`, `Battery bank`)
- **Page headers:** Title Case for titles, sentence case for context descriptions
- **Badges/status labels:** lowercase (`optimal`, `fully utilized`, `clipping expected`, `outside limits`)
- **Form field labels:** Sentence case, abbreviated where standard (`Voc`, `Wp`, `kWh`, `Isc`)
- **Section heads inside panels:** ALL CAPS, tracked out (`ARRAY CONFIGURATION`, `MPPT SELECTION`)

### Technical language
Domain terms are used precisely and consistently (see `UBIQUITOUS_LANGUAGE.md`):
- Always "surface", never "roof face"
- Always "array", never "panel group"  
- Always "MPPT", never "solar charger" or "charge controller"
- Always "conversion device" in code/schema, "converter" in UI labels
- Electrical units: V, A, W, Wp, kWh, kW — no spaces before units

### Verdict language pattern
Verdicts always answer "what relative to what?":
```
Within limits · Optimal
Array → MPPT
This array is closely matched to the selected MPPT.
```

### Emoji
None. Zero. Never. The app is purely typographic and iconographic.

### Numbers
`tabular-nums` and `lnum` OpenType features are always active. Numbers are formatted with `en-US` locale. Electrical values always carry units.

---

## VISUAL FOUNDATIONS

### Color System
Two distinct surfaces: a **deep navy sidebar** (dark) and a **cool off-white main area** (light). The brand accent is a distinctive **teal/mint** (`#00c9a0` / `#00ffc2`).

**Sidebar (dark surface):**
- BG: `#0b1326` (very deep navy-black)
- Text: `#dae2fd` (cool white-blue)
- Muted: `#83958c` (desaturated green-grey)
- Active BG: `#171f33`
- Active text (accent): `#00ffc2` (bright mint — primary brand color in sidebar context)

**Main area (light surface):**
- BG: `#f5f7fa` (cool off-white)
- Surface: `#ffffff`
- Surface low: `#f0f2f6`
- Surface high: `#e8ecf3`
- Text: `#0f1623` (near-black with deep navy tint)
- Muted: `#5a6a7a`
- Border: `#e2e6ee`

**Brand / Semantic:**
- Primary: `#00c9a0` (teal-green)
- Primary dim: `#00a885`
- Warn: `#e07b20`
- Danger: `#c0392b`
- Info: `#3b7dd8`
- Good: `#007255` (dark teal)

**Semantic backgrounds (for status badges/cards):**
- Good BG: `#e6f4ef` / text: `#007255`
- OK BG: `#fef3e6` / text: `#7a4e00`
- Warn BG: `#fdecd8` / text: `#8c4e00`
- Cool BG: `#e8f0fb` / text: `#1a4a8a`
- Danger BG: `#fdecea` / text: `#c0392b`

### Typography
**Single font family:** Inter (with Segoe UI fallback). No serif, no display type.

- Body: `Inter 400`, 14–15px, `line-height: 1.5`
- Section heads: `Inter 600`, 0.82rem, ALL CAPS, `letter-spacing: 0.1em`
- Nav items: `Inter 500`, 0.82rem, ALL CAPS, `letter-spacing: 0.06em`
- Subnav items: `Inter 500`, 0.73rem, ALL CAPS, `letter-spacing: 0.04em`
- Page titles: `Inter 700`, `clamp(1.2rem, 2.2vw, 1.75rem)`
- Logo: `Inter 700`, 0.9rem, ALL CAPS, `letter-spacing: 0.12em`, colored `#00ffc2`
- Eyebrow: `Inter`, 0.72rem, ALL CAPS, `letter-spacing: 0.12em`, `color: var(--primary-dim)`
- Mini stat labels: `Inter`, 0.7–0.72rem, ALL CAPS, `letter-spacing: 0.08em`
- Status badges: `Inter 700`, 0.68rem, ALL CAPS, `letter-spacing: 0.08em`
- Numbers always use `font-variant-numeric: tabular-nums`

Google Fonts substitution: Inter is loaded from Google Fonts (no custom font files in repo).

### Spacing
- Base unit: 8px
- Panel padding: 24px (mobile: 20px 16px)
- App shell padding: 32px (mobile: 20px 16px)
- Grid gaps: 12px (cards), 16px (main grids), 8px (tight configs)
- Section margin-top: 12px between panels

### Borders & Radius
- Panel border-radius: **10px**
- Button border-radius: **8px**  
- Input border-radius: **8px**
- Status badge border-radius: **0** (no rounding — square pill)
- Chain nodes: **8px**
- Image lightbox: **14px**
- Upload dropzone: **10px**, dashed border

### Cards / Panels
- `panel`: white bg, 1px border (`#e2e6ee`), 10px radius, 24px padding
- `surface-card` / `status-card`: `surface-low` bg (`#f0f2f6`), same border and radius
- `summary-card`: `surface-low` bg, 8px radius, no border
- No colored left-border accents. No drop shadows on cards.

### Shadows
Very minimal. Only used on:
- Sidebar (mobile): `12px 0 32px rgba(0,0,0,0.24)` 
- Image lightbox image: `0 20px 60px rgba(0,0,0,0.45)`
- Language switcher buttons: `0 1px 2px rgba(15,22,35,0.18)` (active state)
- Button inset: `0 1px 0 rgba(255,255,255,0.7)` (subtle lift)
- Sidebar buttons inset: `0 1px 0 rgba(255,255,255,0.08)`

### Backgrounds
- No gradient backgrounds on content areas (rare exception: `.production-context-hero` uses a very subtle teal tint gradient)
- No texture, no imagery in UI chrome
- No background images

### Animations & Transitions
- **Minimal.** Transitions on interactive elements: `120–180ms ease`
- Language buttons: `background 160ms ease, color 160ms ease, transform 160ms ease`
- Mobile sidebar: `transform 180ms ease` (slide in)
- Buttons: `:active { transform: translateY(1px) }` — subtle press-down
- No bounces, no spring animations, no elaborate entrances

### Hover States
- Buttons: slightly darker background (`surface-high`)
- Sidebar nav items: `rgba(255,255,255,0.04)` background, muted → sidebar text color
- Active sidebar item: `#00ffc2` text on `#171f33` background

### Buttons
- Compact action toolbars use `button-sm` secondary buttons by default.
- Keep paired actions left-aligned in the toolbar unless a layout explicitly needs a right edge action.
- Reserve primary and danger styles for commit and destructive actions.

### Catalog Table Editing
Catalog tables are dense browsing surfaces for reusable product data. Editing happens in an inline row attached to the selected table item, not in a separate bottom editor.

Interaction rules:
- `Add <item>` and `Edit <item>` live together above the table in compact button sizing.
- `Add <item>` opens a new draft editor row at the top of the table.
- Single-clicking a table row selects it.
- `Edit <item>` opens the selected row inline and is disabled when no row is selected.
- Double-click may open the selected row as a shortcut, but the toolbar action remains the visible path.
- Clicking another row closes any open editor and selects the new row.
- `Cancel` closes the editor without saving.
- `Save` persists the row and closes the editor.
- `Delete` opens a compact app-owned confirmation dialog; confirming deletes the row and closes the editor.

Layout rules:
- Do not use a per-row `Edit` action column for catalog tables.
- Removing an action column must not reduce the table width; give the remaining columns explicit widths.
- The inline editor row spans the full table column count and its editor container fills the available width.
- Form fields follow the visible table column order first.
- Fields not shown in the table are grouped below the table-facing fields.
- `Non-table fields` keeps its open or closed state per catalog for the current browser session.
- Use a compact 6-column field grid on wide catalog pages.
- Use plain, modest checkboxes for binary catalog fields.
- `Save` uses the success button style, `Delete` uses the danger button style, and `Cancel` uses the neutral secondary style.

### Press/Active States
- `transform: translateY(1px)` on buttons and language controls — micro press
- No color changes on press, only position

### Iconography
Custom SVG icon set: `fa-energy` (Font Awesome–derived subset with an energy/grid theme). Always rendered as `<img>` tags with CSS filter to match sidebar muted color. See ICONOGRAPHY section.

### Corner Radii Summary
| Element | Radius |
|---------|--------|
| Panel/Card | 10px |
| Button | 8px |
| Input/Select | 8px |
| Status badge | 0px |
| Summary card | 8px |
| Fit note border accent | 8px |
| Lightbox images | 14px |
| Language switcher wrapper | 12px |
| Language buttons inside | 8px |
| Sidebar collapse button | 12px |

### Layout Rules
- Sidebar: sticky, `100vh`, `220–320px` wide (collapsed: `72px`). Always visible on desktop.
- Main content: `max-width: 1440px`, `padding: 32px`
- Overview grid: `1.25fr / 0.95fr` — not equal columns
- Detail grids: 2 or 3 equal columns with `minmax(0, 1fr)`
- `auto-fit` with minmax for responsive card grids
- No fixed header/topbar — breadcrumbs and page title are in-flow

### Use of Blur / Transparency
- Image lightbox backdrop: `backdrop-filter: blur(2px)` + dark overlay
- Sidebar buttons: rgba transparency for subtle glass-like look
- Mobile sidebar backdrop: `rgba(15,22,35,0.55)` overlay

### Color Vibe of Imagery
- No decorative imagery in the UI
- Site photos and location images are user-uploaded, shown in bordered frames with `object-fit: cover`

---

## ICONOGRAPHY

### Icon System
**fa-energy** — a custom subset of Font Awesome 6 SVG icons, energy-domain themed. Located in `assets/icons/`. All icons are rendered as `<img>` tags (not inline SVG, not icon font).

**Rendering technique:** CSS filter applied to recolor monochrome SVGs:
```css
filter: invert(90%) sepia(8%) saturate(450%) hue-rotate(185deg) brightness(92%) contrast(92%);
```
This produces the sidebar muted text color (`#83958c`) from white SVGs.

### Icon Inventory
| Filename | Usage |
|----------|-------|
| `house.svg` | Location nav item |
| `bolt-lightning.svg` | Production nav item |
| `solar-panel.svg` | Surface subnav items |
| `server.svg` | Storage / Battery bank nav |
| `plug.svg` | Consumption nav |
| `wave-square.svg` | Converters subnav |
| `sitemap.svg` | Load circuits subnav |
| `plug-circle-bolt.svg` | Loads subnav |
| `table-list.svg` | Catalogs nav |
| `book-open.svg` | Reports nav |
| `balance-scale.svg` | Verdict/Evaluation report |
| `eur.svg` | Cost summary report |
| `circle-info.svg` | About nav |
| `square-plus.svg` | New project (disabled) |
| `clipboard-list.svg` | (utility) |
| `list-numeric.svg` / `list-ol.svg` | (utility) |

### No emoji
Emoji are never used as icons or decorative elements.

### No Unicode icon substitutes
The app does not use Unicode characters as icons (e.g. ✓, ×, →). Chevrons (`▾`, `▸`, `◂`) appear only as text characters in sidebar toggle/expand controls.

---

## File Index

```
README.md                       This file — full design system documentation
SKILL.md                        Agent skill definition for Claude Code
colors_and_type.css             All CSS custom properties: colors, type, spacing, radius, shadows

assets/
  icons/                        fa-energy SVG icon subset (17 files)
    house.svg                   Location nav
    bolt-lightning.svg          Production nav
    solar-panel.svg             Surface subnav
    server.svg                  Storage nav
    plug.svg                    Consumption nav
    wave-square.svg             Converters subnav
    sitemap.svg                 Load circuits subnav
    plug-circle-bolt.svg        Loads subnav
    table-list.svg              Catalogs nav
    book-open.svg               Reports nav
    balance-scale.svg           Verdict/Evaluation
    eur.svg                     Cost summary
    circle-info.svg             About
    square-plus.svg             New project
    clipboard-list.svg          Utility
    list-ol.svg                 Utility
    list-numeric.svg            Utility

preview/                        Design System card HTML files (shown in Design System tab)
  colors-brand.html             Brand teal ramp + sidebar navy + main surface
  colors-semantic.html          Status/verdict color pairs (good/warn/cool/danger)
  colors-sidebar.html           Dark sidebar with live nav states
  type-scale.html               Full type scale specimen
  spacing-tokens.html           Spacing scale, border radii, shadows
  components-buttons.html       Button variants (default/primary/danger/sm/block)
  components-catalog.html       Catalog table with inline row editing
  components-badges.html        Status badges + verdict explanation pattern
  components-panels.html        Panel, summary cards, empty state
  components-inputs.html        Form fields, selects, textarea, language switcher
  components-chain.html         System chain nodes + relationship status strip
  components-sidebar.html       Full sidebar component (dark)
  icons.html                    All 17 fa-energy SVGs in light + dark context

ui_kits/
  offgridos-app/
    README.md                   Kit documentation
    index.html                  ★ Interactive prototype (open this)
    Sidebar.jsx                 Sidebar navigation with collapse + subnav
    StatusBadge.jsx             StatusBadge, VerdictCard, WarningPill
    Panel.jsx                   Panel, SectionHead, SummaryCard, Btn, PageHeader, LanguageSwitcher
    LocationPage.jsx            Location screen with site info form + surface list
    ProductionPage.jsx          Production overview + monthly chart + SurfaceDetailPage
    StoragePage.jsx             Battery bank config + ReportsPage (monthly balance)
```

## Design System Tab

The **Design System** tab shows all registered cards grouped by:
- **Colors** — Brand palette, semantic status colors, sidebar tokens
- **Type** — Full type scale specimen
- **Spacing** — Spacing scale, radii, shadows
- **Components** — Buttons, badges, panels, inputs, surface cards, chain, sidebar
- **Brand** — fa-energy icon set
- **Components** — OffGridOS App UI Kit (interactive prototype)
