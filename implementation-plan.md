# Wedding Decision Platform — Implementation Plan

Translates [wedding-decision-platform-prd-v0 4.md](wedding-decision-platform-prd-v0%204.md) (§16 Build sequence, §17 Priority summary) into concrete engineering work against the current repo. The PRD already defines *what* and *why*; this file is *how*, phase by phase, against real tables, routes and files — and it tracks what the scaffold has already done versus what Phase 0 still owes.

---

## 0. Where the repo already is

Phase 0 and Phase 1 are built and verified against the live Supabase project (RLS isolation, the invite/accept loop, and venue CRUD + storage all confirmed end-to-end — see the git history for `supabase/migrations/20260817120000_phase0_foundation.sql` and `20260817140000_phase1_venue_board.sql`). `AGENTS.md`'s "Current State" section is the source of truth for what's built; this section stays as a record of the starting point.

The scaffold that Phase 0 started from shipped generic infrastructure only — no wedding domain model yet:

| Done at scaffold time | Not done at scaffold time |
|---|---|
| Supabase auth (login/signup/magic-link/reset/OAuth) | Project creation, invite-your-partner |
| `[lang]` locale routing (`en`/`de`/`fr`) via `proxy.ts` | RLS on any wedding table (none existed yet) |
| `lib/supabase/{client,server,admin}.ts`, schema-scoped to `wedding` | Currency setup |
| `wedding` Postgres schema created + granted | App shell, navigation, empty states |
| `handle_new_user()` tags this app's signups (`app: 'wedding'`) — no Letly rows created | `wedding` schema not yet exposed in API — now confirmed on |
| — | No `supabase/` folder in this repo — now exists, linked to the same project as Letly |

That gap was PRD Phase 0 minus auth, and it's now closed.

---

## 1. Architecture decisions carried over from the PRD

- **Stack**: Next.js / Supabase / Vercel / Tailwind / shadcn — already in place, matches PRD §16.
- **Charts**: Recharts (break-even chart, §13.2) — not yet a dependency; add when Phase 5 starts.
- **Map**: MapLibre GL JS + `react-map-gl`, vector tiles from MapTiler free tier or self-hosted Protomaps (§11.6). Not Mapbox — avoids pricing exposure. Add in Phase 5.
- **Geocoding/routing** (§10.6) — v1 uses free/cacheable sources, not live flight APIs:
  - Geocoding: Nominatim (OSM) or MapTiler, cached aggressively.
  - Airports: OurAirports open dataset, filtered to scheduled commercial service.
  - Routes: static direct-route table for target regions, refreshed manually.
  - Flight cost: heuristic (distance band × season × direct/connection factor), not live pricing.
  - Drive times: OSRM (self-hostable) or MapTiler/Mapbox directions.
  - Upgrade path to Amadeus/Google APIs is explicitly deferred, not built now.
- **Cost engine principle** (§9.1): store rules, derive numbers. `CostLine` is **never** a table you write to directly — see §3 below for how that's enforced.
- **AI structuring** (§14): server-side only, human-confirmed before anything saves. No auto-fill. Phase 6, not earlier — don't let it creep into Phase 1's URL capture (that's just Open Graph fetch, no model call).
- **Email**: no outbound sending in v1 (§12). Generate + copy/`mailto:` + a per-project inbound-parse address. This needs one webhook endpoint and an email-receiving domain — small but real infra, scope it into Phase 2, not Phase 0.

---

## 2. RLS pattern: projects, not organisations

Letly's tenancy unit is an organisation; this app's is a **Project** (a couple), with **Member** roles `owner` / `partner` / `viewer` (PRD §7). Mirror Letly's proven RLS shape (`public.can_admin()`, `public.get_my_org_id()`) but scoped to project membership instead of org membership:

```sql
-- wedding schema
create table wedding.projects (...);

create table wedding.project_members (
  project_id   uuid references wedding.projects (id) on delete cascade,
  profile_id   uuid references public.profiles (id) on delete cascade,
  role         text not null check (role in ('owner','partner','viewer')),
  status       text not null default 'active',
  invited_at   timestamptz,
  accepted_at  timestamptz,
  primary key (project_id, profile_id)
);

create or replace function wedding.is_project_member(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = wedding, public
as $$
  select exists (
    select 1 from wedding.project_members
    where project_id = p_project_id and profile_id = auth.uid() and status = 'active'
  )
$$;
```

Every subsequent table gets one RLS policy: `using (wedding.is_project_member(project_id))`, same pattern Letly uses for `organisation_id`. This is Phase 0's actual hard work — get it right once, every later phase's tables reuse it verbatim.

**Note the PRD's own callout**: *"get the invite flow right now — retrofitting shared access is painful."* Build `project_members` invite (email invite → accept → row flips to `active`) before any domain table, not after.

---

## 3. Data model foundations to bake in from day one

Four modeling decisions from PRD §7 that are expensive to retrofit — get them right in the Phase 0/1/3/4 migrations that introduce each entity, not later:

| Decision | PRD ref | Shape |
|---|---|---|
| **Option = GuestPlan × Venue × Date**, not a self-contained scenario | §7.1 | `wedding.options(project_id, guest_plan_id, venue_id, event_date, ...)` — cheap to duplicate, sensitivity analysis falls out of holding one dimension fixed |
| **VenueFact as rows, not columns** | §7.2 | `wedding.venue_facts(venue_id, fact_key, fact_value, confidence, provenance jsonb)` — lets "what don't we know yet" be a query, not a hardcoded list |
| **Travel modeled at Household level**, inherited down to guests | §7.3 | `wedding.households` owns origin + travel fields; `wedding.guests` references household, never duplicates them |
| **CostLine is always derived, never stored as truth** | §9.1 | `wedding.cost_rules` is the only stored table (basis, rate, currency, applies_when, confidence, owner). Line items are computed — either a Postgres view/function evaluated per Option, or a cache table with an explicit `recompute_cost_lines(option_id)` call invalidated whenever a rule or the Option's headcount changes. **Decide the view-vs-cache-table trade-off in Phase 4**, not before — you won't know the right answer until the rule evaluation logic exists. |

**Confidence + provenance is a cross-cutting concern**, not a per-table afterthought: define `wedding.confidence_level` as an enum (`guess`, `researched`, `confirmed`, `contracted`, §8) once, and every table that carries a number the couple didn't type with certainty (venue facts, cost rules, journeys) gets a `confidence` + `provenance jsonb` pair from its first migration.

**Origin Clusters are generated, then user-editable** (§10.2) — `wedding.origin_clusters` needs a `generated_at` / `edited_at` distinction so re-running the clustering algorithm doesn't silently clobber a couple's manual corrections.

---

## 4. Phase-by-phase plan

Each phase follows the PRD's own exit criteria (§16) — a real couple could use the product after each one. Don't start a phase's UI before its migration + RLS policy exist (vertical slices, per the PRD's own sequencing note in §16).

### Phase 0 — Foundation ✅ built
`wedding.projects`, `wedding.project_members` (accepted members only), `wedding.project_invitations` (pending, separate table — not a status column on `project_members`, unlike this doc's earlier sketch in §2). RLS bootstrap solved with two `security definer` RPCs, `wedding.create_project()` and `wedding.accept_project_invitation()` — see the comment block at the top of `supabase/migrations/20260817120000_phase0_foundation.sql` for why a plain RLS policy can't authorize a project's first member row. Partner invites are copy-a-link (`/auth/accept-invite?token=`), not app-sent email — Letly's Resend integration exists in code but was never actually configured, so this avoids a real infra dependency for no PRD-required reason; matches the PRD's own §12 reasoning against app-sent mail. App shell at `app/[lang]/(app)/layout.tsx` routes members-without-a-project into `app/[lang]/projects/new/` (deliberately outside the `(app)` group — that layout redirects there, so nesting it inside would loop).
**Exit — met**: verified live against the Supabase project — a second user accepting an invite sees the same project and members list; a non-member is confirmed blocked by RLS, not just by the UI not linking there.

### Phase 1 — Venue Board ✅ built
`wedding.venues`, `wedding.venue_sources`, `wedding.venue_contacts`, `wedding.venue_facts`, `wedding.venue_documents` + a private `wedding-documents` Storage bucket (path `{project_id}/{venue_id}/{filename}`, RLS via `storage.foldername(name)`). Add-by-URL via `app/api/venues/og/route.ts` (server-side fetch + targeted regex on `og:*` meta tags, no HTML-parsing dependency needed for three tags; basic SSRF guard rejects private/loopback hostnames and non-http(s) schemes). Board with a lightweight `considering`/`shortlisted`/`rejected` status filter (separate from the richer Enquiry pipeline Phase 2 adds), venue detail page with Overview / Sources / Facts / Documents / Notes tabs.
**Exit — met**: verified live — RLS blocks a non-member from venues, facts, and the storage bucket alike; a real listing URL (tested against Wikipedia) correctly pre-fills title/image via OG capture.
**Why first** (PRD's own framing): lowest effort, highest immediate payoff — earns the right to ask for the guest list next.

### Phase 2 — Enquiry CRM ✅ built (inbound-parse address deliberately deferred)
`wedding.enquiries` (the PRD's 12-value status pipeline verbatim), `wedding.enquiry_events` (timeline: email/call/whatsapp/viewing/quote/availability_result/note, each optionally linked to an existing `venue_documents` row rather than re-implementing upload), `wedding.quotes` (amount/currency/valid-until, same optional document link). A trigger on `wedding.venues` guarantees every venue has exactly one enquiry from the moment it's created — see `supabase/migrations/20260817160000_phase2_enquiry_crm.sql`. Enquiries are first-class in the nav (PRD §15), not buried under Venues — the venue detail page only shows a compact status-badge card linking out to the full enquiry. Draft-message generator reuses Phase 1's `venue_facts` (checks PRD §7.2's own example fact keys — capacity/curfew/catering_policy/coach_access — against what's already recorded, asks about whatever's missing), copy-button + `mailto:` only, no app-sent mail, same reasoning as Phase 0's invite flow.
**Deferred, by explicit user decision**: the inbound-parse webhook + per-project unique address. No domain capable of receiving mail and no inbound-parsing provider account exist for this project yet, and building the webhook against no real provider would just be guessing at a shape untested infra can't validate. Revisit once a domain/provider is chosen — nothing about the schema (`enquiry_events.event_type` already includes `'email'`) needs to change to add it later.
**Exit — met**: dashboard's needs-attention section shows real counts (enquiries awaiting reply 5+ days, follow-ups due today or earlier) computed from `enquiry_events`/`enquiries`, not placeholder text. Verified live: the venue-creation trigger correctly backfilled an enquiry for a venue that already existed before this migration ran; RLS blocks a non-member from enquiries/events/quotes the same way Phase 1 verified for venues.

### Phase 3 — Guests, Plans and Origins
`wedding.households`, `wedding.guests` (tiers A–D, adult/child, groups), CSV import with a GUI column mapper, fuzzy household detection on import (same surname/address → suggest a household — PRD flags this as high-leverage), geocoding on city+country capture, `wedding.origin_clusters` (auto-generated, editable per §10.2/§3 above), `wedding.guest_plans` + `wedding.guest_plan_rules` (tier/group rules with manual exceptions), live counters.
**Exit**: small/medium/large plans take under 5 minutes once guests are in; app can say "guests come from 8 regions across 5 countries."
**⚠ Decide GDPR handling in this phase, not after first real user** (PRD §22): deletion path, export, plain-language notice, no guest-record retention after project deletion. Household/guest data for people who never consented is the single biggest compliance surface in the product — don't let it be implicit.

### Phase 4 — Options and the Cost Engine
`wedding.options`, `wedding.cost_rules` (all bases from §9.1, `applies_when` conditions), hidden cost templates by venue archetype (§9.2 — mostly content work: bare villa / all-inclusive venue / hotel wedding archetype line-item libraries), derived cost-line computation (§3 above — resolve view-vs-cache decision here), range output with confidence bar, "biggest unknown" callout linking to a draft enquiry.
**Exit**: changing a plan from 64 to 80 guests updates every dependent figure instantly and correctly.
**⚠ PRD's explicit warning**: this is the riskiest phase, more work than 1–3 combined. *Prototype the cost engine on paper or in a spreadsheet against one real villa quote before writing code.*
**⚠ Decide multi-day-wedding scope here, deliberately** (§22): welcome dinner / wedding day / farewell brunch each have different headcounts and cost rules. Modeling only the wedding day may understate totals 20–30%. If in scope, an Option needs to hold a small set of dated events, not one date — that's a real schema change to make now, not retrofit later.

### Phase 5 — Logistics and Compare
`wedding.journeys` (per Origin Cluster × Gateway, §10.3 — legs, connections, door-to-door time, flags), difficulty bands (§10.4), guest-hours metric (§11.2), the map (§11.3 — bubbles → flow lines → venue markers → centre of gravity → gap line, in that order per the PRD's own fallback plan), who-it's-hard-for panel (§11.5), burden fairness split, side-by-side Option comparison (§13.1), break-even/sensitivity chart via Recharts (§13.2), partner ratings, Decision Session (§13.3), recorded Decision.
**Exit**: a couple can point at one screen and say "that's why we chose it."
**⚠ Ship the map in layers, per PRD's own fallback**: Layers 1/4/5 (bubbles, flow lines, markers) with a plain basemap first — that alone delivers most of the value. The burden surface (Layer 2, server-computed heat surface) and coverage rings (Layer 3) are explicitly a second pass, not a Phase 5 blocker.

### Phase 6 — AI structuring
Assisted extraction from text/screenshots/PDFs/brochures, quote parsing into Cost Rules, forwarded-email parsing, generated enquiry messages — all with a confirmation UI as the actual product surface (§14). No model call ships without a human-confirm step; that's not negotiable per the PRD.
**Exit**: a 12-page villa brochure becomes a costed Option in under three minutes.

### Phase 7 — Accommodation, transfers and depth
`wedding.accommodations`, `wedding.allocations`, arrival/departure profiles, coach/transfer planning with auto-generated cost rules, stay-length/room-night demand, burden surface + coverage rings (deferred from Phase 5), attendance forecast, visa/document lead-time tracking, legal ceremony feasibility by country.
**Exit**: "72% of your guests can reach this venue on a direct flight; the average guest will spend €480 to attend."

---

## 5. Sequencing notes (from PRD §16, worth repeating here)

- **Phases 1–2 are the first testable release.** Put it in front of three engaged couples before starting Phase 3 — if venue+enquiry tracking alone doesn't get weekly use, the deeper model (guests, cost engine, logistics) won't rescue it.
- Phases 6 and 7 can reorder based on what test couples complain about most — they're not load-bearing for each other.
- Within a phase, build vertical slices — one entity's schema → RLS policy → server actions/routes → screen — before starting the next entity in that phase. Building all schema, then all API, then all UI produces worse output with AI-assisted development, per the PRD's own note.

## 6. Explicitly deferred / unresolved (PRD §22 — don't accidentally decide these by default)

- **Guest self-service** (shared link for guests to confirm their own travel details) — optional, late-stage, not a core input path.
- **Return journeys** — one journey doubled is fine for v1, except Sunday-departure constraints (already caught by the arrival profile).
- **Origin precision** — city-level only, deliberately. Postcode-level was considered and rejected (marginal accuracy gain, would never get filled in).

## 7. Priority reference (PRD §17, unchanged — repeated here so this file is self-contained)

- **P0**: shared project access · guest list with origins · households/tiers · guest plans · venue records with sources · venue facts with confidence · enquiry tracking + follow-ups · options · cost rules · comparable total as a range · comparison · partner ratings · decision record.
- **P1**: origin clustering · journeys/difficulty bands · map core layers · guest-hours · centre of gravity · hidden cost templates · break-even chart · Decision Session · URL/document extraction · enquiry generation · project inbox · quote management · shareable summary.
- **P2**: burden surface/coverage rings · attendance forecast · accommodation optimiser · arrival profiles/transfer planning · visa lead times · legal feasibility · what-if engine · AI analyst · external venue intelligence.
