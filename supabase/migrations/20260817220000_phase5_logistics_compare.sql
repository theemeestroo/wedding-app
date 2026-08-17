-- =============================================================================
-- Phase 5 — Logistics and Compare
--
-- No new "journeys" table — the Journey/Gateway engine is pure, cheap,
-- deterministic math given two sets of coordinates (see lib/journey-engine.ts),
-- same reasoning as Phase 4's cost engine living in TypeScript rather than
-- plpgsql. This migration only adds venue coordinates (so journeys have
-- somewhere to compute *from*) and the Decision Session tables.
--
-- The visual map (PRD §11) is deliberately deferred this pass — see
-- AGENTS.md / implementation-plan.md for why.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Venue coordinates — geocoded on demand via the existing /api/geocode
--    route (same Nominatim + wedding.geocode_cache infrastructure Phase 3
--    built for households), not backfilled retroactively.
-- ---------------------------------------------------------------------------

alter table wedding.venues add column latitude numeric;
alter table wedding.venues add column longitude numeric;

-- ---------------------------------------------------------------------------
-- 2. Ratings — the Decision Session's blind-until-you-commit reveal is
--    enforced here, not in the UI (which would be trivially bypassable): a
--    member can always read their own rating; they can read someone else's
--    rating for a given option only once they've submitted their own rating
--    for that same option.
-- ---------------------------------------------------------------------------

create table wedding.ratings (
  id          uuid primary key default gen_random_uuid(),
  option_id   uuid not null references wedding.options (id) on delete cascade,
  profile_id  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  rating      text not null check (rating in ('love', 'like', 'neutral', 'dislike')),
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (option_id, profile_id)
);

alter table wedding.ratings enable row level security;

create trigger set_ratings_updated_at
  before update on wedding.ratings
  for each row execute function public.set_updated_at();

-- A policy can't reference its own table in a self-join without Postgres
-- detecting infinite recursion (confirmed live while building this) — the
-- same security-definer-function trick that makes is_project_member() safe
-- to call from other tables' policies applies here too, wrapping the
-- self-referential "have I already rated this option" check.
create or replace function wedding.has_rated_option(p_option_id uuid)
returns boolean
language sql stable security definer
set search_path = wedding, public
as $$
  select exists (
    select 1 from wedding.ratings
    where option_id = p_option_id and profile_id = auth.uid()
  )
$$;

create policy "members can read own rating, or others' after rating themselves" on wedding.ratings
  for select using (
    wedding.is_project_member(wedding.option_project_id(option_id))
    and (
      profile_id = auth.uid()
      or wedding.has_rated_option(option_id)
    )
  );

create policy "members can write their own rating" on wedding.ratings
  for insert with check (
    wedding.is_project_member(wedding.option_project_id(option_id))
    and profile_id = auth.uid()
  );

create policy "members can update their own rating" on wedding.ratings
  for update using (profile_id = auth.uid());

create policy "members can delete their own rating" on wedding.ratings
  for delete using (profile_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Decisions — one recorded decision per project, owner-gated the same
--    way project deletion is.
-- ---------------------------------------------------------------------------

create table wedding.decisions (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null unique references wedding.projects (id) on delete cascade,
  option_id   uuid not null references wedding.options (id) on delete cascade,
  rationale   text,
  decided_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  decided_at  timestamptz not null default now()
);

alter table wedding.decisions enable row level security;

create policy "members can read the decision" on wedding.decisions
  for select using (wedding.is_project_member(project_id));

create policy "owners can record a decision" on wedding.decisions
  for insert with check (wedding.is_project_owner(project_id));

create policy "owners can update the decision" on wedding.decisions
  for update using (wedding.is_project_owner(project_id));

create policy "owners can delete the decision" on wedding.decisions
  for delete using (wedding.is_project_owner(project_id));
