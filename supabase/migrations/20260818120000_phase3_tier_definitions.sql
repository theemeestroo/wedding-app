-- =============================================================================
-- Phase 3 refinement — user-defined tier definitions (Part 1 of 2: expand)
--
-- The hardcoded A/B/C/D household tier (supabase/migrations/
-- 20260817180000_phase3_guests_plans.sql) reads as meaningless jargon with no
-- legend anywhere explaining what each letter means — direct user feedback.
-- Replaces it with wedding.tier_definitions, a per-project, user-managed,
-- ordered set of named categories (add/rename/reorder/delete), following the
-- exact precedent origin_cluster_id already set: a nullable FK with
-- `on delete set null`, no delete-guard — "no tier" becomes a valid, clearly
-- labelled state exactly like "Unassigned" already is for origin clusters,
-- rather than inventing new delete-protection logic.
--
-- Deliberately split into two migrations (expand, then contract later): this
-- one adds wedding.tier_definitions, seeds default categories for every
-- existing project (backfilling households.tier_id from the old lettered
-- households.tier column) and for future ones (wedding.create_project()),
-- and adds the new tier_id / included_tier_ids columns *alongside* the old
-- tier / included_tiers columns, which are deliberately NOT dropped here —
-- they keep their NOT NULL DEFAULT and stay harmless, app code just stops
-- reading/writing them. Drop them only in the follow-up
-- 20260818130000_phase3_tier_definitions_cleanup.sql, after the updated app
-- code is deployed and the backfilled data has been spot-checked. This is
-- the first migration in this repo that transforms and retires existing
-- data rather than purely adding to the schema, so it gets a real review
-- checkpoint (and an explicit transaction wrapper) other migrations haven't
-- needed.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. wedding.tier_definitions — per-project, user-managed, ordered categories
-- ---------------------------------------------------------------------------

create table wedding.tier_definitions (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references wedding.projects (id) on delete cascade,
  label      text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table wedding.tier_definitions enable row level security;

create policy "members can read tier definitions" on wedding.tier_definitions
  for select using (wedding.is_project_member(project_id));
create policy "members can write tier definitions" on wedding.tier_definitions
  for insert with check (wedding.is_project_member(project_id));
create policy "members can update tier definitions" on wedding.tier_definitions
  for update using (wedding.is_project_member(project_id));
create policy "members can delete tier definitions" on wedding.tier_definitions
  for delete using (wedding.is_project_member(project_id));

-- ---------------------------------------------------------------------------
-- 2. Seed default tiers for every EXISTING project, in letter order — these
--    become the A/B/C/D -> tier_id backfill target below. Labels are just a
--    starting point; the couple can rename/reorder/delete them afterward via
--    Settings > Manage tiers.
-- ---------------------------------------------------------------------------

insert into wedding.tier_definitions (project_id, label, sort_order)
select p.id, v.label, v.sort_order
from wedding.projects p
cross join (
  values
    ('Must invite', 0),
    ('Should invite', 1),
    ('Could invite', 2),
    ('If space allows', 3)
) as v(label, sort_order);

-- ---------------------------------------------------------------------------
-- 3. households.tier_id — nullable FK, same shape as origin_cluster_id
-- ---------------------------------------------------------------------------

alter table wedding.households
  add column tier_id uuid references wedding.tier_definitions (id) on delete set null;

update wedding.households h
set tier_id = td.id
from wedding.tier_definitions td
where td.project_id = h.project_id
  and td.sort_order = case h.tier
    when 'A' then 0
    when 'B' then 1
    when 'C' then 2
    when 'D' then 3
  end;

-- ---------------------------------------------------------------------------
-- 4. guest_plans.included_tier_ids — same idea as included_tiers, but ids
-- ---------------------------------------------------------------------------

alter table wedding.guest_plans
  add column included_tier_ids uuid[] not null default '{}';

update wedding.guest_plans gp
set included_tier_ids = coalesce(
  (
    select array_agg(td.id order by td.sort_order)
    from unnest(gp.included_tiers) as letter
    join wedding.tier_definitions td
      on td.project_id = gp.project_id
     and td.sort_order = case letter
       when 'A' then 0
       when 'B' then 1
       when 'C' then 2
       when 'D' then 3
     end
  ),
  '{}'
);

-- ---------------------------------------------------------------------------
-- 5. create_project() — seed the same 4 defaults for every future project
-- ---------------------------------------------------------------------------

create or replace function wedding.create_project(p_name text, p_currency text)
returns uuid
language plpgsql
security definer
set search_path = wedding, public
as $$
declare
  v_project_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into wedding.projects (name, currency, created_by)
  values (p_name, p_currency, auth.uid())
  returning id into v_project_id;

  insert into wedding.project_members (project_id, profile_id, role, status)
  values (v_project_id, auth.uid(), 'owner', 'active');

  insert into wedding.tier_definitions (project_id, label, sort_order)
  values
    (v_project_id, 'Must invite', 0),
    (v_project_id, 'Should invite', 1),
    (v_project_id, 'Could invite', 2),
    (v_project_id, 'If space allows', 3);

  return v_project_id;
end;
$$;

commit;
