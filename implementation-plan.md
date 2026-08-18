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

### Phase 3 — Guests, Plans and Origins ✅ built (including GDPR deletion/export/notice, per explicit user decision)
`wedding.households` (tier A–D and `group_label` live here, not on `guests` — see AGENTS.md's note on why), `wedding.guests` (name + child flag only), `wedding.origin_clusters` + `wedding.recompute_origin_clusters()` (2° grid bucketing, only ever touches unassigned households — see AGENTS.md), `wedding.guest_plans` + `wedding.guest_plan_exceptions` (tier/group rules with per-household overrides; headcount computed client-side from already-fetched data, never stored). Geocoding via Nominatim (`app/api/geocode/route.ts`) backed by the global `wedding.geocode_cache`. CSV import (`/guests/import`) — hand-rolled RFC4180 parser, column mapping, fuzzy household grouping by normalized surname+city, sequential geocoding respecting Nominatim's rate limit.
**GDPR, built this pass**: project deletion (new owner-only RLS policy on `wedding.projects`, storage cleanup handled client-side in `components/settings/delete-project.tsx` since Postgres cascades don't reach Storage objects), per-guest/household delete (ordinary CRUD), a notice on the Guests page + a full `/privacy` page, and CSV/JSON export.
**Exit — met**: the Guests page shows a real "guests come from N regions across M countries" line computed from actual cluster/country data, not placeholder text. Verified live: `recompute_origin_clusters` correctly separated a Manchester pair from a Rome household into distinct clusters with correct averaged centroids; RLS blocks a non-member from households/guests/plans/exceptions and from running the recompute RPC on someone else's project; project deletion was run for real — confirmed zero orphaned rows in any child table and confirmed the Storage object was actually gone, not just the metadata row.

### Phase 4 — Options and the Cost Engine ✅ built (full multi-day Option, per explicit user decision)
`wedding.options` (a bare container — no date of its own), `wedding.option_events` (the dated sub-events; a trigger guarantees one `is_primary` `wedding_day` event from creation, same pattern as Phase 2's venue→enquiry), `wedding.cost_rules` (all nine `basis` values from §9.1; ownership is three nullable FK columns with a check constraint requiring exactly one, not a polymorphic pair; a separate `event_type` tag says which event's headcount a rule evaluates against, independent of where it's owned/reused from). Hidden cost templates (§9.2) are static content in `lib/archetype-templates.ts`, not a table — "mostly content work," per the PRD. The cost engine itself (`lib/cost-engine.ts`) is plain TypeScript, not a Postgres function — see AGENTS.md for why; Postgres owns storage/RLS/the primary-event trigger only.
**The paper prototype the PRD asks for** lives at the top of this file's Phase 4 planning record (see git history for the full plan) and was re-verified by running the actual numbers through the real `computeOptionCosts()`, not just by hand: a €9,000 fixed + €7,200 adult/child catering + €1,600 staff example produces exactly a €17,800 mid total, €12,480–23,120 range, and confirming the catering line narrows the total range by exactly €5,040 while correctly surfacing as "biggest unknown" beforehand.
**Multi-day, built for real**: an event-tagged rule (e.g. welcome-dinner catering) evaluates against that event's own attendance (percentage/fixed-count/full-plan) when the Option has one, and gracefully falls back to the full guest-plan headcount when it doesn't — verified live with a 70%-attendance welcome dinner producing the exact rounded headcount expected, and again with no welcome-dinner event present to confirm the fallback. A `per_room_night` rule with no `rooms`/`nights` set on its event is shown to the user as unevaluable, never silently computed as zero — verified live.
**`applies-when` is guest-count thresholds only** (`min_guests`/`max_guests`) — PRD's other examples ("only if external catering," "only in high season") would need a general condition-expression engine, out of scope for an already-large phase; verified live that a rule outside its bounds is correctly excluded from the total without erroring.
**Exit — met**: verified live end-to-end — RLS blocks a non-member from options/option_events/cost_rules; the owner-constraint correctly rejects both zero-owner and two-owner cost rules; the `.or()` multi-owner query and the `guest_plans(name)`/`venues(name)` embedded-relation query (both novel patterns for this codebase) return exactly the expected shapes.

### Phase 5 — Logistics and Compare ✅ built (full Gateway/airport model; map deferred entirely — both per explicit user decision)
No `wedding.journeys` table — same reasoning as the Phase 4 cost engine: a journey (Origin Cluster × Gateway, §10.3 — legs, connections, door-to-door time, difficulty band) is cheap, deterministic math given two sets of coordinates, computed live by `lib/journey-engine.ts`, not stored. `wedding.venues` gained `latitude`/`longitude` (geocoded on demand from the option detail page via the existing `/api/geocode` route, not backfilled). `lib/data/airports.json` (3,270 rows, real OurAirports data, `large`/`medium` + scheduled service + real IATA code) + `lib/airports.ts` (`findNearestAirport`, haversine) give each cluster/venue a real nearest-Gateway assignment; connection count is a heuristic off real airport-size classification and flight distance, not a claim about specific routes — see AGENTS.md. Difficulty bands (§10.4: easy/moderate/hard/blocked) and the guest-hours metric (§11.2) both live in `computeOptionLogistics()`, rendered as a Logistics panel + who's-it-hard-for list on the option detail page (`components/options/option-detail.tsx`).
**The map (§11.3) is deferred entirely this pass**, not just layered — per explicit user decision. All of its underlying data ships (guest-hours, difficulty bands, who's-it-hard-for), just without a visual map. Burden fairness split and coverage rings (§11's Layers 2–3) remain deferred to Phase 7, as originally planned.
**Compare** (`app/[lang]/(app)/compare/page.tsx` + `components/compare/compare-board.tsx`): pick 2+ of the project's Options, side-by-side table (venue, guest plan, total cost range, per-guest, guest-hours, difficulty split, ratings, decided badge) plus a Recharts break-even line chart sweeping a synthetic guest count (20→150, preserving each option's adult:child ratio) through the unchanged `computeOptionCosts()`. Deliberately not broken down by cost category (Venue/Catering/etc. as separate comparable rows) — `cost_rules` has no `category` dimension, and total-plus-link-to-full-breakdown covers the comparison job without adding one just for this view.
**Decision Session** (§13.3), simplified from the PRD's multi-step choreography into one step — rate + note together, not rate → reveal → separate disagreement-note step. `wedding.ratings` (`option_id, profile_id default auth.uid(), rating, note`) with a genuinely RLS-enforced blind reveal: `wedding.has_rated_option()` (`security definer`, same pattern as `is_project_member()`) backs the SELECT policy so a member can't see anyone else's rating for an option until they've submitted their own — a plain inline self-join was tried first and rejected by Postgres as infinite recursion (confirmed live), which is why the helper-function indirection exists. `wedding.decisions` (`project_id unique, option_id, rationale, decided_by default auth.uid(), decided_at`) records the recorded Decision, owner-gated the same way project deletion is.
**Exit — met**: a couple can point at one screen (the option detail page's Logistics/Ratings/Decision sections, or Compare) and say "that's why we chose it." Verified live against the real Supabase project: journey math sanity-checked against real city pairs (London→Florence lands `moderate` at ~4.9h, Sydney→Florence lands `hard` at ~26.6h with one connection, matching real-world travel); `/api/geocode` genuinely geocoded "Florence, Italy" via Nominatim and cached it; the blind-reveal mechanic confirmed both directions with two real test users (rater A invisible to B until B also rates, then mutually visible); decision recording confirmed owner-gated (a partner's insert attempt was rejected with 42501, the owner's succeeded); a non-member confirmed blocked from reading or writing ratings/decisions entirely.

### Phase 6 — AI structuring
Assisted extraction from text/screenshots/PDFs/brochures, quote parsing into Cost Rules, forwarded-email parsing, generated enquiry messages — all with a confirmation UI as the actual product surface (§14). No model call ships without a human-confirm step; that's not negotiable per the PRD.
**Exit**: a 12-page villa brochure becomes a costed Option in under three minutes.

### Phase 7 — Accommodation, transfers and depth ✅ built (full — accommodation, allocation, arrival/departure, auto cost rules, the travel map, attendance forecast, and self-reported visa notes; legal-feasibility tracking deliberately has no dedicated feature, see below)
`wedding.accommodations` (venue-scoped, mirrors the `venue_facts` confidence/provenance pattern), `wedding.arrival_profiles` (option × household, optional arrival/departure date + coarse time-of-day window, unique per option/household), `wedding.allocations` (option × household → accommodation, one per household per option in v1). No new RLS helper functions — accommodations reuse `wedding.venue_project_id()`, the other two reuse `wedding.option_project_id()`, same as every table since Phase 1/4.

`lib/accommodation-engine.ts` closes two of the PRD's three §10.5 feedback loops as plain TypeScript, same reasoning as the cost/journey engines: `computeAccommodationCost()` sums `rooms_assigned × nights × nightly_rate` per allocation, nights derived from the household's arrival profile or defaulted to 2 nights (arrive the day before, leave the day after) when unset; `computeTransferEstimate()` groups households into arrival "waves" by `(origin_cluster_id, arrival_date, arrival_window)` and sizes coaches/cars off a headcount heuristic, always at `guess` confidence — explicitly not a real transport-pricing lookup, same honesty framing as the journey engine's flight-cost heuristic (see AGENTS.md).

New "Estimate accommodation & transfer costs" button on the option detail page (between the existing Logistics and Ratings panels) runs both engines and upserts two `cost_rules` rows (`"Accommodation (auto-calculated)"`, `"Transfers (auto-estimated)"`) by deleting any existing rule with that label for the option and inserting fresh — same apply-and-edit UX as the Phase 4 archetype-template button, both rules land in the existing Cost lines panel exactly like a manually-added rule. This also gives `provenance jsonb` (present on `venue_facts`/`cost_rules` since Phase 1/4, unused until now) its first real reader/writer, tagging auto-generated rules with `{ source: 'accommodation_engine' }`.

A new venue tab (`components/venues/venue-accommodation-tab.tsx`) manages accommodation records, mirroring `venue-facts-tab.tsx`'s list/add-form/confidence-badge shape closely enough that the confidence badge itself was promoted to a shared `components/shared/confidence-badge.tsx` (now used by both).

**The travel map (PRD §11) lives inside Compare, not a new route** — `compare/page.tsx` already fetched everything `computeOptionLogistics` needs per selected Option (venue coordinates, per-household cluster assignments), so the map view (`components/compare/compare-board.tsx`'s new Table/Map toggle) reuses that data directly rather than duplicating a fetch. Selecting 3+ options surfaces an A/B/C pill that switches which Option's venue is "active" (its bubbles recolour, flow lines redraw, burden surface + rings recompute) while every candidate venue still shows as a marker — the PRD's own answer for "compare mode" with more than two venues; true synced side-by-side canvases for exactly two venues wasn't built.

All five layers are real, computed data, not a static illustration: `lib/burden-surface-engine.ts` samples an adaptive ~300-point grid over the clusters' bounding box for the burden surface (Layer 2), `lib/contour-utils.ts` wraps the new `d3-contour` dependency to turn that grid into real lat/lng GeoJSON contours, and coverage rings (Layer 3) ship as true circles — an explicit PRD §11.3 v1 shortcut ("ship true circles with an explicit caveat in the legend") rather than a second full contour surface, with the caveat text living in the map legend. Flow lines (Layer 4) use real great-circle interpolation, not straight lines. `components/map/travel-map.tsx` is plain `maplibre-gl`, not `react-map-gl` — five custom GeoJSON layers redrawing together on every toggle were more predictable to manage imperatively. Computed client-side on demand, same reasoning as every other engine in this app (no caching layer exists anywhere yet).

The grid engine avoids the naive O(grid points × clusters × 2) airport-lookup cost by resolving each unique coordinate's nearest airport once (`lib/journey-engine.ts` gained an additive, behaviour-preserving refactor — `computeJourneyFromAirports()` extracted from `computeJourney()`'s fly branch, plus exporting `DRIVE_THRESHOLD_KM` and three previously-private heuristic helpers — so the grid engine reuses the exact formulas instead of duplicating them).

`lib/attendance-engine.ts` is the third §10.5 feedback loop (travel difficulty → expected decline), a small invented decline-rate table by difficulty band, always informational — cost/budget calculations still use full invited headcount, the safer default. Surfaced both in the option detail page's Logistics panel and in the map's side panel.

Visa notes are self-reported only, per the earlier user decision: `wedding.arrival_profiles` gained a `visa_notes text` column (visa lead-time is tied to a specific wedding date, so it belongs on the option×household row, not on `households`) with a plain text field in the existing Accommodation & Transfers table — the app stores whatever the couple types and never computes or asserts a real visa requirement. Legal ceremony feasibility (the venue/country-level half of "visa/legal tracking") deliberately got no new schema or UI — it's the same shape as an existing `venue_facts` row or the `venues.notes` tab already, and a dedicated feature identical to something that already exists would be pure duplication.

**Exit — met**: "72% of your guests can reach this venue on a direct flight" is answerable from the map's per-cluster difficulty data; "the average guest will spend €X to attend" combines the accommodation and transfer estimates from the core slice with journey cost-per-person.

**Known verification gap**: the WebGL canvas itself could not be visually confirmed rendering end-to-end in this environment's headless browser testing (real authenticated walkthrough got real computed data into the side panel/legend/attendance-forecast UI correctly, and the MapTiler style/sprite/tile endpoints all responded 200 with a correctly-sized canvas and a working WebGL2 context, but MapLibre's own render loop stalled before painting — consistent with known headless/software-WebGL limitations for GPU-heavy libraries, not an error surfaced anywhere in the app's own code or MapLibre's error events). Worth a quick check in a real browser before relying on the map.

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
