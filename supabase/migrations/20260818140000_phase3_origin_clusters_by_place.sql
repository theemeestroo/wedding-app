-- =============================================================================
-- Phase 3 refinement — origin clusters keyed by place, not a geographic grid
--
-- wedding.recompute_origin_clusters() only ever clustered households that
-- weren't yet assigned (origin_cluster_id is null) and always INSERTed a new
-- wedding.origin_clusters row for each bucket — it never checked whether a
-- cluster for that same origin already existed. Every time new households
-- were added and recompute was re-run, this created duplicate cluster rows
-- for the same place instead of merging into the existing one (confirmed
-- live: three separate "Munich" clusters, two separate "Düsseldorf"
-- clusters). The same root cause explains a second, related complaint: the
-- old coarse 2° lat/lng grid bucketing also merged genuinely different towns
-- together whenever they happened to fall in the same grid cell — one of
-- the "Düsseldorf" rows had silently absorbed households from Aachen and
-- Hümmel too (confirmed live: that single row held 5 Düsseldorf + 1 Aachen +
-- 1 Hümmel household).
--
-- Fix: cluster by (home_country, home_city) instead of a geographic grid —
-- an unambiguous, stable key a recompute run can look up rather than
-- guessing from coordinates — enforced with a real unique constraint so
-- this can't silently duplicate again.
--
-- The one-time cleanup below re-derives every currently-clustered
-- household's TRUE place directly from its own home_city/home_country
-- (never from a cluster row's existing label or mode() over its members —
-- a mixed blob's mode() would just silently confirm the majority city and
-- keep hiding the minority ones, which is the exact bug being fixed).
-- For continuity, a place reuses an existing cluster row in this project
-- already labelled after that exact city (picking the most-populated one
-- on a tie, e.g. across the three duplicate "Munich" rows); otherwise it
-- gets a fresh row. Known, accepted tradeoff: if a cluster had been
-- manually renamed to something that no longer matches its city name, this
-- reuse-by-label matching won't find it, so that custom label doesn't
-- survive — accepted because nothing in the live data indicates any
-- cluster has actually been renamed away from its default city-name label,
-- and the alternative (perfectly reuniting a relabelled row with its
-- correct place) isn't worth the added complexity for a one-time cleanup.
-- =============================================================================

begin;

alter table wedding.origin_clusters
  add column home_country text,
  add column home_city text;

do $$
declare
  grp record;
  v_cluster_id uuid;
begin
  for grp in
    select
      h.project_id,
      trim(h.home_country) as home_country,
      trim(h.home_city) as home_city,
      array_agg(h.id) as household_ids
    from wedding.households h
    where h.origin_cluster_id is not null
      and h.home_country is not null
      and h.home_city is not null
    group by h.project_id, trim(h.home_country), trim(h.home_city)
  loop
    select oc.id into v_cluster_id
    from wedding.origin_clusters oc
    where oc.project_id = grp.project_id
      and lower(trim(oc.label)) in (lower(grp.home_city), lower(grp.home_city || ', ' || grp.home_country))
    order by (select count(*) from wedding.households where origin_cluster_id = oc.id) desc
    limit 1;

    if v_cluster_id is null then
      insert into wedding.origin_clusters (project_id, label, home_country, home_city)
      values (grp.project_id, grp.home_city || ', ' || grp.home_country, grp.home_country, grp.home_city)
      returning id into v_cluster_id;
    else
      update wedding.origin_clusters
      set home_country = grp.home_country, home_city = grp.home_city
      where id = v_cluster_id;
    end if;

    update wedding.households
    set origin_cluster_id = v_cluster_id
    where id = any(grp.household_ids);
  end loop;

  -- Anything nobody claimed above is either a now-empty duplicate row or a
  -- leftover blob whose members all moved to their correct place — safe to
  -- drop; the FK is `on delete set null`, and every household that should
  -- stay clustered has already been repointed by the loop above.
  delete from wedding.origin_clusters where home_country is null;
end $$;

update wedding.origin_clusters oc
set centroid_lat = sub.avg_lat, centroid_lng = sub.avg_lng
from (
  select origin_cluster_id, avg(latitude) as avg_lat, avg(longitude) as avg_lng
  from wedding.households
  where origin_cluster_id is not null
  group by origin_cluster_id
) sub
where sub.origin_cluster_id = oc.id;

alter table wedding.origin_clusters
  alter column home_country set not null,
  alter column home_city set not null,
  add constraint origin_clusters_project_place_key unique (project_id, home_country, home_city);

-- ---------------------------------------------------------------------------
-- recompute_origin_clusters() — key by place, upsert instead of blind
-- insert, preserve an existing cluster's (possibly renamed) label.
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
begin
  if not wedding.is_project_member(p_project_id) then
    raise exception 'Not a member of this project';
  end if;

  for bucket in
    select
      array_agg(id) as household_ids,
      trim(home_country) as home_country,
      trim(home_city) as home_city
    from wedding.households
    where project_id = p_project_id
      and origin_cluster_id is null
      and latitude is not null
      and longitude is not null
      and home_city is not null
      and home_country is not null
    group by trim(home_country), trim(home_city)
  loop
    insert into wedding.origin_clusters (project_id, label, home_country, home_city)
    values (p_project_id, bucket.home_city || ', ' || bucket.home_country, bucket.home_country, bucket.home_city)
    on conflict (project_id, home_country, home_city)
    do update set label = wedding.origin_clusters.label
    returning id into v_cluster_id;

    update wedding.households
    set origin_cluster_id = v_cluster_id
    where id = any(bucket.household_ids);
  end loop;

  -- Self-healing: recompute every cluster's centroid in this project, not
  -- just the ones touched this run, so it can never silently drift stale.
  update wedding.origin_clusters oc
  set centroid_lat = sub.avg_lat, centroid_lng = sub.avg_lng
  from (
    select origin_cluster_id, avg(latitude) as avg_lat, avg(longitude) as avg_lng
    from wedding.households
    where origin_cluster_id is not null
    group by origin_cluster_id
  ) sub
  where sub.origin_cluster_id = oc.id and oc.project_id = p_project_id;
end;
$$;

commit;
