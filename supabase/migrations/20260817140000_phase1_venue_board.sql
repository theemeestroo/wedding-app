-- =============================================================================
-- Phase 1 — Venue Board
--
-- Venues, their multiple Sources (PRD §7: "the venue is not the listing"),
-- contacts, open-ended Facts with confidence (§7.2), and documents backed by
-- a private Storage bucket. All RLS reuses wedding.is_project_member() via
-- wedding.venue_project_id(), same pattern Phase 0 established.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Venues
-- ---------------------------------------------------------------------------

create table wedding.venues (
  id               uuid primary key default gen_random_uuid(),
  project_id       uuid not null references wedding.projects (id) on delete cascade,
  name             text not null,
  location_city    text,
  location_country text,
  archetype        text check (archetype in ('bare_villa', 'all_inclusive', 'hotel')),
  status           text not null default 'considering' check (status in ('considering', 'shortlisted', 'rejected')),
  notes            text,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now()
);

alter table wedding.venues enable row level security;

-- Shared lookup every child table's RLS policy reuses.
create or replace function wedding.venue_project_id(p_venue_id uuid)
returns uuid
language sql stable security definer
set search_path = wedding, public
as $$
  select project_id from wedding.venues where id = p_venue_id
$$;

create policy "members can read venues" on wedding.venues
  for select using (wedding.is_project_member(project_id));

create policy "members can write venues" on wedding.venues
  for insert with check (wedding.is_project_member(project_id));

create policy "members can update venues" on wedding.venues
  for update using (wedding.is_project_member(project_id));

create policy "members can delete venues" on wedding.venues
  for delete using (wedding.is_project_member(project_id));

-- ---------------------------------------------------------------------------
-- 2. Sources — multiple per venue
-- ---------------------------------------------------------------------------

create table wedding.venue_sources (
  id              uuid primary key default gen_random_uuid(),
  venue_id        uuid not null references wedding.venues (id) on delete cascade,
  url             text not null,
  platform        text,
  title           text,
  image_url       text,
  description     text,
  price_shown     text,
  last_checked_at timestamptz,
  created_at      timestamptz not null default now()
);

alter table wedding.venue_sources enable row level security;

create policy "members can read venue sources" on wedding.venue_sources
  for select using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can write venue sources" on wedding.venue_sources
  for insert with check (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can update venue sources" on wedding.venue_sources
  for update using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can delete venue sources" on wedding.venue_sources
  for delete using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

-- ---------------------------------------------------------------------------
-- 3. Contacts
-- ---------------------------------------------------------------------------

create table wedding.venue_contacts (
  id       uuid primary key default gen_random_uuid(),
  venue_id uuid not null references wedding.venues (id) on delete cascade,
  name     text,
  email    text,
  phone    text,
  role     text,
  notes    text
);

alter table wedding.venue_contacts enable row level security;

create policy "members can read venue contacts" on wedding.venue_contacts
  for select using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can write venue contacts" on wedding.venue_contacts
  for insert with check (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can update venue contacts" on wedding.venue_contacts
  for update using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can delete venue contacts" on wedding.venue_contacts
  for delete using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

-- ---------------------------------------------------------------------------
-- 4. Facts — open-ended key/value with confidence (PRD §7.2), not columns
-- ---------------------------------------------------------------------------

create table wedding.venue_facts (
  id         uuid primary key default gen_random_uuid(),
  venue_id   uuid not null references wedding.venues (id) on delete cascade,
  fact_key   text not null,
  fact_value text not null,
  confidence wedding.confidence_level not null default 'guess',
  provenance jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table wedding.venue_facts enable row level security;

-- Reuses the generic trigger function Letly already established in `public`.
create trigger set_venue_facts_updated_at
  before update on wedding.venue_facts
  for each row execute function public.set_updated_at();

create policy "members can read venue facts" on wedding.venue_facts
  for select using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can write venue facts" on wedding.venue_facts
  for insert with check (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can update venue facts" on wedding.venue_facts
  for update using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can delete venue facts" on wedding.venue_facts
  for delete using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

-- ---------------------------------------------------------------------------
-- 5. Documents — metadata table + private Storage bucket
-- ---------------------------------------------------------------------------

create table wedding.venue_documents (
  id           uuid primary key default gen_random_uuid(),
  venue_id     uuid not null references wedding.venues (id) on delete cascade,
  storage_path text not null,
  filename     text not null,
  uploaded_by  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table wedding.venue_documents enable row level security;

create policy "members can read venue documents" on wedding.venue_documents
  for select using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can write venue documents" on wedding.venue_documents
  for insert with check (wedding.is_project_member(wedding.venue_project_id(venue_id)));

create policy "members can delete venue documents" on wedding.venue_documents
  for delete using (wedding.is_project_member(wedding.venue_project_id(venue_id)));

-- Private bucket. Path convention: {project_id}/{venue_id}/{filename}.
insert into storage.buckets (id, name, public)
values ('wedding-documents', 'wedding-documents', false)
on conflict (id) do nothing;

create policy "project members can read documents in storage"
on storage.objects for select
using (
  bucket_id = 'wedding-documents'
  and wedding.is_project_member((storage.foldername(name))[1]::uuid)
);

create policy "project members can upload documents to storage"
on storage.objects for insert
with check (
  bucket_id = 'wedding-documents'
  and wedding.is_project_member((storage.foldername(name))[1]::uuid)
);

create policy "project members can delete documents from storage"
on storage.objects for delete
using (
  bucket_id = 'wedding-documents'
  and wedding.is_project_member((storage.foldername(name))[1]::uuid)
);
