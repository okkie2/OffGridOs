# Roadmap: Local Tool → SaaS Platform

This document maps the path from the current single-tenant local app to the multi-tenant platform described in `docs/pitch.md`. Each phase has a concrete technical scope, a user-facing outcome, and an exit condition before the next phase begins.

---

## Baseline: Today

- Single project, single user, single SQLite file on Railway
- Full digital twin: surfaces, yield, battery sizing, MPPT compatibility, cost summary, consumption
- Component catalog with real entries (panels, MPPTs, batteries, inverters, cabinets)
- Deployed at `offgridos.eu`, local-first publish workflow
- No auth, no accounts, no sharing

The deployment docs explicitly call this out as a single-instance, single-user shape. That is the correct foundation — the hard product problem (accurate real-time system modeling) is solved. What follows is the platform layer on top of it.

---

## Phase 1: Multi-Project (weeks 1–6)

**Goal:** one instance of the app can hold multiple independent projects.

**Why first:** everything else — auth, sharing, installer dashboard — depends on projects being first-class entities. This is a pure data model change with no user-facing auth complexity yet.

### Technical work

- Add a `projects` table: `(project_id, title, created_at)`
- Scope every existing table with `project_id` via a migration
- Update all API routes: `/api/projects/:projectId/surfaces`, `/api/projects/:projectId/battery-types`, etc.
- Update the frontend URL scheme: `/en/:locationSlug/...` → `/projects/:projectId/en/:locationSlug/...` (or keep slug-based with project prefix)
- Add a project switcher / project list screen as the new root landing page
- The "create new project" flow from `AboutPage` gets promoted to this root

### What stays the same

- SQLite on Railway (still fine for low concurrency)
- No auth yet — a single login owns all projects
- The digital twin model is unchanged; only the routing and scoping changes

### Exit condition

Multiple independent projects can be created, edited, and switched between without data leaking across them.

---

## Phase 2: Auth and Accounts (weeks 6–12)

**Goal:** individual users can sign in and own their own projects.

**Why here:** multi-project without auth is just a local UX improvement. Auth is what turns it into a hosted product.

### Technical work

- Integrate an auth provider (Clerk is the fastest path; Auth0 or Supabase Auth are alternatives)
- Add a `users` table mirroring the auth provider's user ID
- Add `user_id` to the `projects` table as owner
- All API routes check the authenticated user and return only their projects
- SQLite → **PostgreSQL migration**: this is the biggest technical lift in the roadmap
  - Replace `better-sqlite3` with `pg` or `postgres` (node-postgres)
  - All queries change from synchronous to async — budget 2–3 weeks
  - Railway already supports managed Postgres; the volume-based SQLite setup is retired
  - Row-level security at the application layer (not Postgres RLS, which adds complexity without benefit at this scale)
- Deploy with environment-based config for `DATABASE_URL`

### What changes for the user

- Sign-in screen before the app loads
- Projects are private to the signed-in user by default
- The publish workflow (`npm run publish:db`) is retired; the database is the live database

### Exit condition

A user can create an account, sign in, create projects, and know their data is private to them.

---

## Phase 3: Project Sharing and Roles (weeks 12–20)

**Goal:** a project owner can invite another user to view or edit their project.

This is the core collaboration feature that enables both installer flows described in the pitch.

### Technical work

- Add `project_members` table: `(project_id, user_id, role, invited_email, accepted_at)`
  - Roles: `owner`, `editor`, `viewer`
- Invite flow: enter an email address → pending invite created → invited user gets an email → they accept and the membership activates
- If the invited user doesn't have an account yet, the invite email contains a signup link that pre-accepts the membership on registration
- API layer enforces role: `viewer` gets read-only endpoints, `editor` gets full write access
- Frontend shows a read-only mode for `viewer` role (disable edit controls, show "view only" indicator)
- Project settings screen: list members, change roles, revoke access, transfer ownership

### User-facing flows enabled

**Installer-led:** installer creates project, configures the full system, invites the homeowner as `viewer`. Homeowner can browse and review the digital twin without editing.

**Homeowner-led:** homeowner creates a project and starts configuring. They invite an installer as `editor`. Installer refines the design and hands it back.

**Promotion:** a `viewer` can be promoted to `editor` (and back) by the owner at any time.

### Exit condition

An installer can create a project and share it with a client who has no prior account, and that client can view the project after accepting the invite.

---

## Phase 4: Installer Product and First Revenue (weeks 20–32)

**Goal:** installers pay for access and the product earns its first revenue.

### Installer-specific features

- **Installer dashboard:** a top-level view showing all projects the installer owns or edits, with client name, last-edited date, and system status badge
- **Client label on project:** a free-text "client name" field on project settings (not a full CRM — just enough to identify whose house it is)
- **PDF proposal export:** export the current digital twin state as a formatted PDF — surface layout, system specification, component list, cost summary. This is the primary proposal artifact an installer delivers to a client
- **Project duplication:** duplicate an existing project as a starting point for a similar installation (same roof geometry, different client)

### Monetisation

- Integrate Stripe
- Free tier: 1 project, no sharing (homeowners building their own config)
- Installer tier (€99/month): unlimited projects, unlimited sharing, PDF export, installer dashboard
- Billing portal accessible from account settings

### Go-to-market

- Direct outreach to 20–30 independent installers in NL and BE
- Offer 3-month free pilot in exchange for structured feedback
- Target: 20 paying installer seats at end of phase

### Exit condition

20 paying installer seats. At least 5 installers have actively shared a project with a homeowner client using the platform.

---

## Phase 5: Verified Equipment Catalog (months 8–15)

**Goal:** equipment brands can own and maintain their catalog entries, and pay for visibility.

### Background

The component catalog is already a differentiator — it is embedded in the workflow tool that installers use daily. Brands that want accurate specs and current pricing in the tool have a clear incentive to maintain their own entries.

### Technical work

- Add a `brands` table: `(brand_id, name, website, contact_email, verified_at)`
- Add `brand_id` as a claimable field on catalog entries (panel types, battery types, inverters, MPPTs)
- Brand portal: a separate login context where a brand representative can manage their catalog entries — update specs, pricing, add new models, retire discontinued models
- "Verified" badge shown on catalog entries that are brand-maintained
- Brand entries cannot be deleted by installers (only hidden from personal view)

### Monetisation

- Brand listing subscription: €500–€2,000/month per brand per market
- Includes: verified badge, direct catalog management, aggregate usage analytics (how many projects use their products, in which regions)

### Go-to-market

- Target distributor contacts first (they often represent multiple brands)
- Approach Victron Energy, Pylontech, and Canadian Solar as flagship verified brands
- The verified catalog is a trust signal for homeowners reviewing their installer's proposal

### Exit condition

5 paying brand subscriptions. Verified entries cover at least 60% of catalog items in active use across installer projects.

---

## Phase 6: Homeowner Marketplace (months 15–24)

**Goal:** homeowners who have configured a project can request quotes from verified installers in their region.

### Background

By this point there are hundreds of homeowner-created projects (free tier) with complete or partial system configurations. These are high-intent buyers. Installers want access to them. The marketplace closes the loop.

### Technical work

- Installer profiles: public page showing name, region, languages spoken, number of completed projects, average response time
- "Request a quote" button on homeowner projects: publishes a scoped view of the project configuration to matched installers in the homeowner's region
- Installer quote inbox: installers see incoming requests, can view the shared configuration, and respond with a quote or a message
- Rating and review after a completed installation

### Monetisation

- Lead fee per quote request delivered to an installer (€15–€40 depending on system size)
- Or: monthly marketplace tier (€199/month) for unlimited leads within a region
- Homeowner tier remains free

### Cold-start mitigation

The marketplace cold-start problem (no installers without homeowners, no homeowners without installers) is mitigated by the installer SaaS base built in Phase 4. By the time the marketplace launches, there are already paying installers on the platform with active projects. The homeowner inquiry flow gives those installers a new lead channel on top of their existing subscription value.

### Exit condition

50 quote requests submitted. 20% conversion to a scheduled site visit (tracked via installer confirmation). Geographic coverage in NL, BE, and at least one DE city region.

---

## Technical Risk Register

| Risk | Mitigation |
|---|---|
| SQLite → PostgreSQL migration breaks existing data | Run a full schema export/import on a staging database before cutting over; keep the SQLite publish endpoint live as a rollback path during migration week |
| Auth provider adds complexity / cost at scale | Use Clerk for speed now; it can be replaced with self-hosted Auth.js later if cost becomes an issue |
| Postgres concurrency issues replacing SQLite | Already expected — the single-instance SQLite constraint is what forces the move; Postgres handles concurrent writes natively |
| Installer adoption slower than expected | The free tier with 1 project is the acquisition channel; installers who use it for their own home will upgrade when they want to use it professionally |
| Brand catalog negotiations stall | Launch without brand payments first — offer free verified status to 3 flagship brands to seed the badge; introduce billing once the badge has visible value |
| Marketplace cold start | Installer base built in Phase 4 is the supply side; paid acquisition of homeowner signups in Phase 6 covers demand |

---

## What Does Not Change

The core digital twin model stays intact throughout all phases. The energy flow model (`Location → Production → Storage → Consumption → Reports`), the component catalog structure, the yield estimation logic, and the compatibility evaluation engine are the product. The phases above are the distribution and monetisation layer built around a working tool.

---

*See also: `docs/pitch.md` for the investor narrative, `docs/app-organisation.md` for the current product structure, `docs/deployment.md` for the current hosting setup.*
