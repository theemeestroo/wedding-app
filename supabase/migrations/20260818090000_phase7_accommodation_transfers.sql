-- =============================================================================
-- Phase 7 (core slice) — Accommodation, Allocation, Arrival/Departure
--
-- Deliberately scoped down from the full Phase 7 description in
-- implementation-plan.md: this migration covers accommodations, allocations
-- and arrival/departure profiles only, the concrete data-model piece that
-- closes two of the PRD's three §10.5 feedback loops ("arrival profile →
-- transfer costs", "stay length → accommodation cost"). Burden surface /
-- coverage rings (a real geospatial/map feature) and visa/legal-feasibility
-- tracking (real regulatory facts with no licensed dataset behind them, same
-- honesty concern Phase 5 already worked through for flight routes) are
-- explicitly deferred — per user decision, see implementation-plan.md.
--
-- No new RLS helper functions: accommodations are venue-scoped (reuses
-- wedding.venue_project_id(), same as venue_facts/venue_sources), and
-- arrival_profiles/allocations are option-scoped (reuses
-- wedding.option_project_id(), same as ratings/decisions).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Accommodations — venue rooms / hotels / villas. Each fact-like enough
--    (confidence + provenance) to follow the venue_facts pattern rather than
--    being treated as certain from entry.
-- ---------------------------------------------------------------------------

create table wedding.accommodations (
  id               uuid primary key default gen_random_uuid(),
  venue_id         uuid not null references wedding.venues (id) on delete cascade,
  name             text not null,
  type             text not null default 'hotel'
                     check (type in ('venue_block', 'hotel', 'villa', 'other')),
  rooms_available  int,
  capacity_adults  int,
  capacity_children int,
  nightly_rate     numeric,
  currency         text,
  confidence       wedding.confidence_level not null default 'guess',
  provenance       jsonb,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table wedding.accommodations enable row level security;

create trigger set_accommodations_updated_at
  before update on wedding.accommodations
  for each row execute function public.set_updated_at();

create policy "members can read accommodations" on wedding.accommodations
  for select using (wedding.is_project_member(wedding.venue_project_id(venue_id)));
create policy "members can write accommodations" on wedding.accommodations
  for insert with check (wedding.is_project_member(wedding.venue_project_id(venue_id)));
create policy "members can update accommodations" on wedding.accommodations
  for update using (wedding.is_project_member(wedding.venue_project_id(venue_id)));
create policy "members can delete accommodations" on wedding.accommodations
  for delete using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

-- ---------------------------------------------------------------------------
-- 2. Arrival/departure profiles — household-level (not cluster-level),
--    matching the app's existing "model travel at household level, inherit
--    down" convention (PRD §7.3, already used throughout Phase 3/5). Cluster
--    grouping for the transfer/coach heuristic is derived at query time by
--    joining household.origin_cluster_id, not stored separately here.
--
--    One row per (option, household) — arrival/departure is meaningful per
--    Option because different Options can have different venues and dates.
--    Optional by design (nullable dates/windows): only fill in where it
--    changes an outcome, same "12 households need travel details" philosophy
--    as the rest of the optional travel fields the PRD describes.
-- ---------------------------------------------------------------------------

create table wedding.arrival_profiles (
  id                uuid primary key default gen_random_uuid(),
  option_id         uuid not null references wedding.options (id) on delete cascade,
  household_id      uuid not null references wedding.households (id) on delete cascade,
  arrival_date      date,
  arrival_window    text check (arrival_window in ('morning', 'afternoon', 'evening', 'night')),
  departure_date    date,
  departure_window  text check (departure_window in ('morning', 'afternoon', 'evening', 'night')),
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (option_id, household_id)
);

alter table wedding.arrival_profiles enable row level security;

create trigger set_arrival_profiles_updated_at
  before update on wedding.arrival_profiles
  for each row execute function public.set_updated_at();

create policy "members can read arrival profiles" on wedding.arrival_profiles
  for select using (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can write arrival profiles" on wedding.arrival_profiles
  for insert with check (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can update arrival profiles" on wedding.arrival_profiles
  for update using (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can delete arrival profiles" on wedding.arrival_profiles
  for delete using (wedding.is_project_member(wedding.option_project_id(option_id)));

-- ---------------------------------------------------------------------------
-- 3. Allocations — guest (household) → accommodation, per Option. Nights are
--    deliberately NOT duplicated here; they come from arrival_profiles, so
--    there's one source of truth for "how long are they staying" — the same
--    derive-don't-duplicate principle CostLine already follows for cost.
--    One accommodation per household per option in v1 (a household split
--    across two properties is an edge case, deferred).
-- ---------------------------------------------------------------------------

create table wedding.allocations (
  id                uuid primary key default gen_random_uuid(),
  option_id         uuid not null references wedding.options (id) on delete cascade,
  household_id      uuid not null references wedding.households (id) on delete cascade,
  accommodation_id  uuid not null references wedding.accommodations (id) on delete cascade,
  rooms_assigned    numeric not null default 1,
  confirmed         boolean not null default false,
  notes             text,
  created_at        timestamptz not null default now(),
  unique (option_id, household_id)
);

alter table wedding.allocations enable row level security;

create policy "members can read allocations" on wedding.allocations
  for select using (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can write allocations" on wedding.allocations
  for insert with check (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can update allocations" on wedding.allocations
  for update using (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can delete allocations" on wedding.allocations
  for delete using (wedding.is_project_member(wedding.option_project_id(option_id)));
