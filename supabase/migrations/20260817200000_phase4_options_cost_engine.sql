-- =============================================================================
-- Phase 4 — Options and the Cost Engine
--
-- Full multi-day Option (a deliberate, explicit scope decision — not the
-- single-date sketch in the PRD's original §7 data model): an Option is a
-- container of dated sub-events (welcome dinner / wedding day / farewell
-- brunch / other), each with its own attendance and cost rules.
--
-- The actual cost EVALUATION logic lives in lib/cost-engine.ts, not here —
-- see that file's header comment for why. This migration only owns storage,
-- RLS, and the "an Option always has a primary event" invariant.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Options
-- ---------------------------------------------------------------------------

create table wedding.options (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references wedding.projects (id) on delete cascade,
  guest_plan_id  uuid not null references wedding.guest_plans (id) on delete cascade,
  venue_id       uuid not null references wedding.venues (id) on delete cascade,
  name           text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);

alter table wedding.options enable row level security;

create policy "members can read options" on wedding.options
  for select using (wedding.is_project_member(project_id));
create policy "members can write options" on wedding.options
  for insert with check (wedding.is_project_member(project_id));
create policy "members can update options" on wedding.options
  for update using (wedding.is_project_member(project_id));
create policy "members can delete options" on wedding.options
  for delete using (wedding.is_project_member(project_id));

create or replace function wedding.option_project_id(p_option_id uuid)
returns uuid
language sql stable security definer
set search_path = wedding, public
as $$
  select project_id from wedding.options where id = p_option_id
$$;

-- ---------------------------------------------------------------------------
-- 2. Option events — the dated sub-events. Exactly one primary per option,
--    guaranteed by the trigger below, same "never leave the invariant
--    unsatisfied" pattern as Phase 2's venue → enquiry trigger.
-- ---------------------------------------------------------------------------

create table wedding.option_events (
  id                     uuid primary key default gen_random_uuid(),
  option_id              uuid not null references wedding.options (id) on delete cascade,
  event_type             text not null default 'wedding_day'
                           check (event_type in ('welcome_dinner', 'wedding_day', 'farewell_brunch', 'other')),
  label                  text,
  event_date             date,
  attendance_mode        text not null default 'full_plan'
                           check (attendance_mode in ('full_plan', 'percentage', 'fixed_count')),
  attendance_percentage  numeric check (attendance_percentage >= 0 and attendance_percentage <= 100),
  attendance_adults      int,
  attendance_children    int,
  nights                 numeric,
  rooms                  numeric,
  hours                  numeric,
  is_primary             boolean not null default false,
  created_at             timestamptz not null default now()
);

alter table wedding.option_events enable row level security;

create unique index option_events_one_primary on wedding.option_events (option_id) where is_primary;

create policy "members can read option events" on wedding.option_events
  for select using (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can write option events" on wedding.option_events
  for insert with check (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can update option events" on wedding.option_events
  for update using (wedding.is_project_member(wedding.option_project_id(option_id)));
create policy "members can delete option events" on wedding.option_events
  for delete using (wedding.is_project_member(wedding.option_project_id(option_id)));

create or replace function wedding.option_event_project_id(p_option_event_id uuid)
returns uuid
language sql stable security definer
set search_path = wedding, public
as $$
  select wedding.option_project_id(option_id) from wedding.option_events where id = p_option_event_id
$$;

create or replace function wedding.create_primary_event_for_option()
returns trigger
language plpgsql
security definer
set search_path = wedding, public
as $$
begin
  insert into wedding.option_events (option_id, event_type, label, attendance_mode, is_primary)
  values (new.id, 'wedding_day', 'Wedding day', 'full_plan', true);
  return new;
end;
$$;

create trigger create_primary_event_after_option_insert
  after insert on wedding.options
  for each row execute function wedding.create_primary_event_for_option();

-- ---------------------------------------------------------------------------
-- 3. Cost rules — owned by exactly one of venue/guest_plan/option (real FK
--    integrity via three nullable columns + a check constraint, not a
--    polymorphic owner_type/owner_id pair), optionally tagged with an
--    event_type that's independent of ownership: it says which event's
--    headcount to evaluate against, not where the rule is defined/reused
--    from. See lib/cost-engine.ts for how event_type resolution degrades
--    gracefully when an Option has no matching event yet.
-- ---------------------------------------------------------------------------

create table wedding.cost_rules (
  id             uuid primary key default gen_random_uuid(),
  venue_id       uuid references wedding.venues (id) on delete cascade,
  guest_plan_id  uuid references wedding.guest_plans (id) on delete cascade,
  option_id      uuid references wedding.options (id) on delete cascade,
  event_type     text check (event_type in ('welcome_dinner', 'wedding_day', 'farewell_brunch', 'other')),
  label          text not null,
  basis          text not null check (basis in (
                   'fixed', 'per_adult', 'per_guest', 'per_child', 'per_room',
                   'per_room_night', 'per_person_night', 'per_hour', 'percent_of_subtotal'
                 )),
  rate           numeric not null,
  currency       text,
  min_guests     int,
  max_guests     int,
  confidence     wedding.confidence_level not null default 'guess',
  provenance     jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint cost_rules_exactly_one_owner check (
    (case when venue_id is not null then 1 else 0 end
     + case when guest_plan_id is not null then 1 else 0 end
     + case when option_id is not null then 1 else 0 end) = 1
  )
);

alter table wedding.cost_rules enable row level security;

create trigger set_cost_rules_updated_at
  before update on wedding.cost_rules
  for each row execute function public.set_updated_at();

create policy "members can read cost rules" on wedding.cost_rules
  for select using (
    wedding.is_project_member(
      coalesce(
        wedding.venue_project_id(venue_id),
        wedding.guest_plan_project_id(guest_plan_id),
        wedding.option_project_id(option_id)
      )
    )
  );
create policy "members can write cost rules" on wedding.cost_rules
  for insert with check (
    wedding.is_project_member(
      coalesce(
        wedding.venue_project_id(venue_id),
        wedding.guest_plan_project_id(guest_plan_id),
        wedding.option_project_id(option_id)
      )
    )
  );
create policy "members can update cost rules" on wedding.cost_rules
  for update using (
    wedding.is_project_member(
      coalesce(
        wedding.venue_project_id(venue_id),
        wedding.guest_plan_project_id(guest_plan_id),
        wedding.option_project_id(option_id)
      )
    )
  );
create policy "members can delete cost rules" on wedding.cost_rules
  for delete using (
    wedding.is_project_member(
      coalesce(
        wedding.venue_project_id(venue_id),
        wedding.guest_plan_project_id(guest_plan_id),
        wedding.option_project_id(option_id)
      )
    )
  );
