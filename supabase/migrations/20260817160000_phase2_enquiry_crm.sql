-- =============================================================================
-- Phase 2 — Enquiry CRM
--
-- Every venue always has exactly one enquiry (PRD §12: "every venue has an
-- enquiry with a status pipeline") — enforced by a trigger on wedding.venues
-- rather than left to the app to remember, with a backfill for venues Phase 1
-- already created. RLS extends the wedding.venue_project_id() pattern one
-- level via wedding.enquiry_project_id().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enquiries
-- ---------------------------------------------------------------------------

create table wedding.enquiries (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null unique references wedding.venues (id) on delete cascade,
  status          text not null default 'not_contacted' check (status in (
                    'not_contacted', 'drafting', 'sent', 'awaiting_response', 'replied',
                    'follow_up_required', 'quote_received', 'viewing_booked',
                    'shortlisted', 'no_availability', 'rejected', 'booked'
                  )),
  follow_up_date  date,
  next_action     text,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table wedding.enquiries enable row level security;

create policy "members can read enquiries" on wedding.enquiries
  for select using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can write enquiries" on wedding.enquiries
  for insert with check (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can update enquiries" on wedding.enquiries
  for update using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

-- No delete policy — an enquiry only ever goes away when its venue does
-- (on delete cascade), preserving the "every venue has an enquiry" invariant.

-- ---------------------------------------------------------------------------
-- 2. Auto-create an enquiry whenever a venue is created, and backfill
--    any venues Phase 1 already created without one.
-- ---------------------------------------------------------------------------

create or replace function wedding.create_enquiry_for_venue()
returns trigger
language plpgsql
security definer
set search_path = wedding, public
as $$
begin
  insert into wedding.enquiries (venue_id, status)
  values (new.id, 'not_contacted');
  return new;
end;
$$;

create trigger create_enquiry_after_venue_insert
  after insert on wedding.venues
  for each row execute function wedding.create_enquiry_for_venue();

insert into wedding.enquiries (venue_id, status)
select v.id, 'not_contacted'
from wedding.venues v
left join wedding.enquiries e on e.venue_id = v.id
where e.id is null;

-- ---------------------------------------------------------------------------
-- 3. enquiry_project_id() — extends venue_project_id() one level
-- ---------------------------------------------------------------------------

create or replace function wedding.enquiry_project_id(p_enquiry_id uuid)
returns uuid
language sql stable security definer
set search_path = wedding, public
as $$
  select wedding.venue_project_id(venue_id) from wedding.enquiries where id = p_enquiry_id
$$;

-- ---------------------------------------------------------------------------
-- 4. Timeline events
-- ---------------------------------------------------------------------------

create table wedding.enquiry_events (
  id           uuid primary key default gen_random_uuid(),
  enquiry_id   uuid not null references wedding.enquiries (id) on delete cascade,
  event_type   text not null check (event_type in (
                 'email', 'call', 'whatsapp', 'viewing', 'quote', 'availability_result', 'note'
               )),
  occurred_at  timestamptz not null default now(),
  notes        text,
  document_id  uuid references wedding.venue_documents (id) on delete set null,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table wedding.enquiry_events enable row level security;

create policy "members can read enquiry events" on wedding.enquiry_events
  for select using (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));

create policy "members can write enquiry events" on wedding.enquiry_events
  for insert with check (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));

create policy "members can update enquiry events" on wedding.enquiry_events
  for update using (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));

create policy "members can delete enquiry events" on wedding.enquiry_events
  for delete using (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));

-- ---------------------------------------------------------------------------
-- 5. Quotes
-- ---------------------------------------------------------------------------

create table wedding.quotes (
  id           uuid primary key default gen_random_uuid(),
  enquiry_id   uuid not null references wedding.enquiries (id) on delete cascade,
  amount       numeric,
  currency     text,
  valid_until  date,
  notes        text,
  document_id  uuid references wedding.venue_documents (id) on delete set null,
  received_at  timestamptz not null default now()
);

alter table wedding.quotes enable row level security;

create policy "members can read quotes" on wedding.quotes
  for select using (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));

create policy "members can write quotes" on wedding.quotes
  for insert with check (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));

create policy "members can update quotes" on wedding.quotes
  for update using (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));

create policy "members can delete quotes" on wedding.quotes
  for delete using (wedding.is_project_member(wedding.enquiry_project_id(enquiry_id)));
