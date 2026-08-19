-- =============================================================================
-- Phase 7b — Individual rooms, room-level allocation
--
-- Reworks Phase 7's accommodation model. Before this migration, an
-- "accommodation" row was both the property and the room inventory in one
-- (a single rooms_available/capacity_adults/capacity_children/nightly_rate
-- tuple for the whole property), and wedding.allocations mapped a household
-- to that property with a bare rooms_assigned count — no way to manage
-- distinct room types within a property, and nothing stopping two
-- allocations from double-counting against the same physical room.
--
-- New shape: wedding.accommodations is the property record only.
-- wedding.accommodation_rooms is the bookable unit — capacity, type and rate
-- live here, one row per room (bulk-created together, but each independently
-- allocatable). wedding.allocations now points at a specific room_id, with a
-- unique(option_id, room_id) constraint as the DB-level guarantee that a room
-- can't be double-booked within the same Option — the UI's room pickers only
-- ever offer rooms not already taken, but this is the backstop.
--
-- Clean drop-and-recreate: existing accommodations/allocations rows predate
-- any real couple using this app (this app's own testing convention is
-- throwaway test accounts, cleaned up after — see AGENTS.md) and aren't
-- carried forward. Per explicit user decision, not an oversight.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Drop the old allocations shape first (references accommodations.id
--    indirectly via accommodation_id) and the columns on accommodations that
--    move to the new per-room table.
-- ---------------------------------------------------------------------------

drop table wedding.allocations;

alter table wedding.accommodations
  drop column rooms_available,
  drop column capacity_adults,
  drop column capacity_children,
  drop column nightly_rate,
  drop column currency;

-- ---------------------------------------------------------------------------
-- 2. accommodation_rooms — the individual bookable item. "Block create" is
--    an app-level insert of N rows sharing type/capacity/rate with
--    auto-numbered labels, not a quantity column — each room is its own row
--    from the start so it can be independently allocated.
-- ---------------------------------------------------------------------------

create table wedding.accommodation_rooms (
  id                uuid primary key default gen_random_uuid(),
  accommodation_id  uuid not null references wedding.accommodations (id) on delete cascade,
  label             text not null,
  room_type         text,
  capacity_adults   int not null default 2,
  capacity_children int not null default 0,
  nightly_rate      numeric not null,
  currency          text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table wedding.accommodation_rooms enable row level security;

create trigger set_accommodation_rooms_updated_at
  before update on wedding.accommodation_rooms
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 3. accommodation_room_project_id() — extends venue_project_id() two
--    levels (room -> accommodation -> venue), same "extend one level at a
--    time" pattern as enquiry_project_id()/option_project_id().
-- ---------------------------------------------------------------------------

create or replace function wedding.accommodation_room_project_id(p_room_id uuid)
returns uuid
language sql stable security definer
set search_path = wedding, public
as $$
  select wedding.venue_project_id(a.venue_id)
  from wedding.accommodation_rooms r
  join wedding.accommodations a on a.id = r.accommodation_id
  where r.id = p_room_id
$$;

create policy "members can read accommodation rooms" on wedding.accommodation_rooms
  for select using (wedding.is_project_member(wedding.venue_project_id((select venue_id from wedding.accommodations where id = accommodation_id))));
create policy "members can write accommodation rooms" on wedding.accommodation_rooms
  for insert with check (wedding.is_project_member(wedding.venue_project_id((select venue_id from wedding.accommodations where id = accommodation_id))));
create policy "members can update accommodation rooms" on wedding.accommodation_rooms
  for update using (wedding.is_project_member(wedding.venue_project_id((select venue_id from wedding.accommodations where id = accommodation_id))));
create policy "members can delete accommodation rooms" on wedding.accommodation_rooms
  for delete using (wedding.is_project_member(wedding.venue_project_id((select venue_id from wedding.accommodations where id = accommodation_id))));

-- ---------------------------------------------------------------------------
-- 4. allocations, recreated — one row per (option, room). A household can
--    now hold multiple rooms (multiple rows), but a room can't be booked
--    twice within the same Option (unique(option_id, room_id)).
-- ---------------------------------------------------------------------------

create table wedding.allocations (
  id            uuid primary key default gen_random_uuid(),
  option_id     uuid not null references wedding.options (id) on delete cascade,
  household_id  uuid not null references wedding.households (id) on delete cascade,
  room_id       uuid not null references wedding.accommodation_rooms (id) on delete cascade,
  confirmed     boolean not null default false,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (option_id, room_id)
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
