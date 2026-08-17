-- =============================================================================
-- Phase 0 — Foundation
--
-- Projects, membership, and partner invitations. Everything from Phase 1
-- onward hangs off wedding.is_project_member(), established here.
--
-- RLS bootstrap problem: a fresh project has no members yet, so a plain RLS
-- policy on project_members can't let its own creator insert the first row
-- (nothing to check membership against). Two security-definer functions
-- sidestep this — create_project() and accept_project_invitation() — the
-- same role handle_new_user() plays for signups, but user-triggered instead
-- of trigger-triggered. Every other table/function in this schema goes
-- through plain RLS using wedding.is_project_member().
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Shared confidence enum — used from Phase 1 onward too (PRD §8)
-- ---------------------------------------------------------------------------

create type wedding.confidence_level as enum ('guess', 'researched', 'confirmed', 'contracted');

-- ---------------------------------------------------------------------------
-- 2. Projects
-- ---------------------------------------------------------------------------

create table wedding.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  currency    text not null default 'GBP' check (currency ~ '^[A-Z]{3}$'),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table wedding.projects enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Members — only ever holds accepted members
-- ---------------------------------------------------------------------------

create table wedding.project_members (
  project_id  uuid not null references wedding.projects (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        text not null check (role in ('owner', 'partner', 'viewer')),
  status      text not null default 'active' check (status in ('active', 'removed')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, profile_id)
);

alter table wedding.project_members enable row level security;

-- ---------------------------------------------------------------------------
-- 4. Invitations — pending invites live here, separate from members
-- ---------------------------------------------------------------------------

create table wedding.project_invitations (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references wedding.projects (id) on delete cascade,
  email        text not null,
  role         text not null default 'partner' check (role in ('partner', 'viewer')),
  token        text not null unique,
  invited_by   uuid references public.profiles (id) on delete set null,
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now()
);

alter table wedding.project_invitations enable row level security;

-- ---------------------------------------------------------------------------
-- 5. RLS building blocks — every future table in this schema reuses these
-- ---------------------------------------------------------------------------

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

create or replace function wedding.is_project_owner(p_project_id uuid)
returns boolean
language sql stable security definer
set search_path = wedding, public
as $$
  select exists (
    select 1 from wedding.project_members
    where project_id = p_project_id and profile_id = auth.uid() and status = 'active' and role = 'owner'
  )
$$;

-- ---------------------------------------------------------------------------
-- 6. RLS policies
-- ---------------------------------------------------------------------------

create policy "members can read their project" on wedding.projects
  for select using (wedding.is_project_member(id));

create policy "members can update their project" on wedding.projects
  for update using (wedding.is_project_member(id));

-- No insert/delete policy on projects — creation goes through
-- create_project() (security definer); deletion isn't supported in v1.

create policy "members can read project members" on wedding.project_members
  for select using (wedding.is_project_member(project_id));

create policy "owners can update project members" on wedding.project_members
  for update using (wedding.is_project_owner(project_id));

-- No direct insert policy — rows are only created via create_project() and
-- accept_project_invitation() (both security definer).

create policy "members can read invitations" on wedding.project_invitations
  for select using (wedding.is_project_member(project_id));

create policy "owners can create invitations" on wedding.project_invitations
  for insert with check (wedding.is_project_owner(project_id));

create policy "owners can update invitations" on wedding.project_invitations
  for update using (wedding.is_project_owner(project_id));

-- ---------------------------------------------------------------------------
-- 7. create_project() — bootstraps a project + its creator's owner row
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

  return v_project_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. accept_project_invitation() — validates token, creates the member row
-- ---------------------------------------------------------------------------

create or replace function wedding.accept_project_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = wedding, public
as $$
declare
  v_invite      wedding.project_invitations;
  v_user_email  text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_user_email from auth.users where id = auth.uid();

  select * into v_invite
  from wedding.project_invitations
  where token = p_token
    and accepted_at is null
    and expires_at > now();

  if v_invite is null then
    raise exception 'Invitation not found or expired';
  end if;

  if lower(v_invite.email) <> lower(v_user_email) then
    raise exception 'This invitation was sent to a different email address';
  end if;

  insert into wedding.project_members (project_id, profile_id, role, status)
  values (v_invite.project_id, auth.uid(), v_invite.role, 'active')
  on conflict (project_id, profile_id) do update set status = 'active';

  update wedding.project_invitations
  set accepted_at = now()
  where id = v_invite.id;

  return v_invite.project_id;
end;
$$;
