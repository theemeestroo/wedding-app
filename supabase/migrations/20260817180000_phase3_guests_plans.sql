-- =============================================================================
-- Phase 3 — Guests, Plans and Origins
--
-- Tier and group are household-level (PRD §7's data model tree reads
-- Guest ── Household ── Tier — tier belongs to the household, matching how
-- "who's invited at each size" actually operates). Guests only carry name
-- and the child flag. RLS extends the wedding.venue_project_id() /
-- wedding.enquiry_project_id() pattern with two more *_project_id() helpers.
--
-- Also adds project deletion (deliberately left out in Phase 0) — GDPR's
-- "no retention after project deletion" is the reason to add it now, per an
-- explicit user decision made alongside this migration.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Origin clusters
-- ---------------------------------------------------------------------------

create table wedding.origin_clusters (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references wedding.projects (id) on delete cascade,
  label         text not null,
  centroid_lat  numeric,
  centroid_lng  numeric,
  created_at    timestamptz not null default now()
);

alter table wedding.origin_clusters enable row level security;

create policy "members can read origin clusters" on wedding.origin_clusters
  for select using (wedding.is_project_member(project_id));
create policy "members can write origin clusters" on wedding.origin_clusters
  for insert with check (wedding.is_project_member(project_id));
create policy "members can update origin clusters" on wedding.origin_clusters
  for update using (wedding.is_project_member(project_id));
create policy "members can delete origin clusters" on wedding.origin_clusters
  for delete using (wedding.is_project_member(project_id));

-- ---------------------------------------------------------------------------
-- 2. Households — tier and group live here, not on individual guests
-- ---------------------------------------------------------------------------

create table wedding.households (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references wedding.projects (id) on delete cascade,
  name              text not null,
  home_city         text,
  home_country      text,
  latitude          numeric,
  longitude         numeric,
  tier              text not null default 'B' check (tier in ('A', 'B', 'C', 'D')),
  group_label       text,
  origin_cluster_id uuid references wedding.origin_clusters (id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table wedding.households enable row level security;

create policy "members can read households" on wedding.households
  for select using (wedding.is_project_member(project_id));
create policy "members can write households" on wedding.households
  for insert with check (wedding.is_project_member(project_id));
create policy "members can update households" on wedding.households
  for update using (wedding.is_project_member(project_id));
create policy "members can delete households" on wedding.households
  for delete using (wedding.is_project_member(project_id));

create or replace function wedding.household_project_id(p_household_id uuid)
returns uuid
language sql stable security definer
set search_path = wedding, public
as $$
  select project_id from wedding.households where id = p_household_id
$$;

-- ---------------------------------------------------------------------------
-- 3. Guests — identity + child flag only
-- ---------------------------------------------------------------------------

create table wedding.guests (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references wedding.households (id) on delete cascade,
  first_name   text not null,
  last_name    text,
  is_child     boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table wedding.guests enable row level security;

create policy "members can read guests" on wedding.guests
  for select using (wedding.is_project_member(wedding.household_project_id(household_id)));
create policy "members can write guests" on wedding.guests
  for insert with check (wedding.is_project_member(wedding.household_project_id(household_id)));
create policy "members can update guests" on wedding.guests
  for update using (wedding.is_project_member(wedding.household_project_id(household_id)));
create policy "members can delete guests" on wedding.guests
  for delete using (wedding.is_project_member(wedding.household_project_id(household_id)));

-- ---------------------------------------------------------------------------
-- 4. Guest plans — tier/group rules; headcount is computed, never stored
-- ---------------------------------------------------------------------------

create table wedding.guest_plans (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references wedding.projects (id) on delete cascade,
  name            text not null,
  included_tiers  text[] not null default '{}',
  included_groups text[] not null default '{}',
  created_at      timestamptz not null default now()
);

alter table wedding.guest_plans enable row level security;

create policy "members can read guest plans" on wedding.guest_plans
  for select using (wedding.is_project_member(project_id));
create policy "members can write guest plans" on wedding.guest_plans
  for insert with check (wedding.is_project_member(project_id));
create policy "members can update guest plans" on wedding.guest_plans
  for update using (wedding.is_project_member(project_id));
create policy "members can delete guest plans" on wedding.guest_plans
  for delete using (wedding.is_project_member(project_id));

create or replace function wedding.guest_plan_project_id(p_guest_plan_id uuid)
returns uuid
language sql stable security definer
set search_path = wedding, public
as $$
  select project_id from wedding.guest_plans where id = p_guest_plan_id
$$;

create table wedding.guest_plan_exceptions (
  id            uuid primary key default gen_random_uuid(),
  guest_plan_id uuid not null references wedding.guest_plans (id) on delete cascade,
  household_id  uuid not null references wedding.households (id) on delete cascade,
  include       boolean not null,
  unique (guest_plan_id, household_id)
);

alter table wedding.guest_plan_exceptions enable row level security;

create policy "members can read guest plan exceptions" on wedding.guest_plan_exceptions
  for select using (wedding.is_project_member(wedding.guest_plan_project_id(guest_plan_id)));
create policy "members can write guest plan exceptions" on wedding.guest_plan_exceptions
  for insert with check (wedding.is_project_member(wedding.guest_plan_project_id(guest_plan_id)));
create policy "members can update guest plan exceptions" on wedding.guest_plan_exceptions
  for update using (wedding.is_project_member(wedding.guest_plan_project_id(guest_plan_id)));
create policy "members can delete guest plan exceptions" on wedding.guest_plan_exceptions
  for delete using (wedding.is_project_member(wedding.guest_plan_project_id(guest_plan_id)));

-- ---------------------------------------------------------------------------
-- 5. Geocode cache — global, not project-scoped (same city = same result for
--    every project). RLS enabled with zero policies: authenticated/anon get
--    nothing, only the admin client (service_role, bypasses RLS) in
--    app/api/geocode/route.ts ever touches this table.
-- ---------------------------------------------------------------------------

create table wedding.geocode_cache (
  id         uuid primary key default gen_random_uuid(),
  query      text not null unique,
  latitude   numeric,
  longitude  numeric,
  created_at timestamptz not null default now()
);

alter table wedding.geocode_cache enable row level security;

-- ---------------------------------------------------------------------------
-- 6. Origin cluster recompute — only buckets unassigned households, so a
--    manual reassignment (or a previous recompute's assignment) is never
--    overwritten. Coarse 2° grid — a placeholder; Phase 5's gateway-based
--    clustering supersedes this.
-- ---------------------------------------------------------------------------

create or replace function wedding.recompute_origin_clusters(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = wedding, public
as $$
declare
  bucket record;
  v_cluster_id uuid;
  v_label text;
begin
  if not wedding.is_project_member(p_project_id) then
    raise exception 'Not a member of this project';
  end if;

  for bucket in
    select
      array_agg(id) as household_ids,
      avg(latitude) as avg_lat,
      avg(longitude) as avg_lng,
      mode() within group (order by home_city) as common_city,
      mode() within group (order by home_country) as common_country
    from wedding.households
    where project_id = p_project_id
      and origin_cluster_id is null
      and latitude is not null
      and longitude is not null
    group by floor(latitude / 2), floor(longitude / 2)
  loop
    v_label := coalesce(bucket.common_city, bucket.common_country, 'New cluster');

    insert into wedding.origin_clusters (project_id, label, centroid_lat, centroid_lng)
    values (p_project_id, v_label, bucket.avg_lat, bucket.avg_lng)
    returning id into v_cluster_id;

    update wedding.households
    set origin_cluster_id = v_cluster_id
    where id = any(bucket.household_ids);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Project deletion (GDPR — "no retention after project deletion")
-- ---------------------------------------------------------------------------

create policy "owners can delete their project" on wedding.projects
  for delete using (wedding.is_project_owner(id));
