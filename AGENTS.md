# Wedding Decision Platform — Agent Guidelines

## Product Overview

See [wedding-decision-platform-prd-v0 4.md](wedding-decision-platform-prd-v0%204.md) for the full PRD. In short: a collaborative platform that helps couples compare wedding options (guest list → travel feasibility → venue → cost) before committing to one — not a post-decision planning tool.

## Key Documents

- **[wedding-decision-platform-prd-v0 4.md](wedding-decision-platform-prd-v0%204.md)** — product requirements: vision, data model, cost/logistics engines, priorities
- **[implementation-plan.md](implementation-plan.md)** — engineering phases against this repo: what's built, what's next, key architecture decisions

## Architecture Rules

- **Shared Supabase project, not a shared app**: this app uses the same Supabase project as Letly (`letly/`, a separate repo), isolated by Postgres schema (`NEXT_PUBLIC_APP_SCHEMA=wedding`). `auth.users` is the one thing genuinely shared — everything else (tables, RLS, workspace/membership model) belongs to this app alone. See `letly/supabase-schema-split-plan.md` in the Letly repo for the full rationale.
- **Signup metadata**: `supabase.auth.signUp()` calls from this app must include `options.data.app = 'wedding'` (see `components/auth/signup-form.tsx`) — the shared `handle_new_user()` trigger uses it to skip Letly's org-provisioning branch.
- **Workspace provisioning is this app's own responsibility.** Nothing about weddings, guests, or venues should ever be created by a database trigger shared with Letly — provision via this app's own schema-scoped `lib/supabase/admin.ts` client, in this app's own code.
- **i18n routing**: same `[lang]` pattern as Letly — locale-aware routes live under `app/[lang]/(group)/`. Translations live in `messages/{en,de,fr}.json`; run `npm run i18n:sync` after adding keys to `en.json` (requires `DEEPL_API_KEY`).
- **Bare (non-`[lang]`) route pairing is `(auth)`-only.** `proxy.ts` redirects every bare path to its `/{locale}` equivalent before Next.js resolves it, so a bare page is unreachable by real traffic — it only exists as dead weight unless something specifically needs it. The `(auth)` pages (login/signup/reset-password/accept-invite) keep bare English-only counterparts because they were carried over from Letly's convention; every other route group (`(app)`, and anything after it) is `[lang]`-only. Don't add new bare pages outside `(auth)` without a real reason.
- **Projects, not organisations.** The tenancy unit is `wedding.projects` (a couple), not an org — `wedding.project_members` (`owner`/`partner`/`viewer`) and `wedding.is_project_member()`/`is_project_owner()` mirror Letly's org-RLS shape. `wedding.create_project()` and `wedding.accept_project_invitation()` are `security definer` because RLS can't authorize the very first membership row for a project that has none yet — see the comment at the top of `supabase/migrations/20260817120000_phase0_foundation.sql`.
- **Partner invites are copy-a-link, not app-sent email**, deliberately — same reasoning the PRD gives for venue enquiries (§12): app-sent mail from an unverified domain is a liability, a link isn't. `wedding.project_invitations` holds the token; `/auth/accept-invite?token=` previews it via `app/api/invitations/[token]/route.ts` (admin client — the visitor isn't a project member yet, so RLS can't authorize that read) and accepts via the RPC once authenticated.
- **This repo owns its own migrations** in `supabase/` (linked to the same project as Letly, `project-ref prycwxeojswobkmkrsiw`). Apply with `supabase db query --linked --file <path>` — the CLI's migration ledger is out of sync with what's actually been applied (established while building Phase 0), so `supabase db push` isn't safe to use yet.
- **Every venue-scoped table's RLS goes through `wedding.venue_project_id(venue_id)`** (defined in `supabase/migrations/20260817140000_phase1_venue_board.sql`), not a raw subquery repeated per policy. Any new table hanging off `venues` should reuse it the same way `venue_sources`/`venue_facts`/`venue_contacts`/`venue_documents` do.
- **Documents live in the private `wedding-documents` Storage bucket**, path `{project_id}/{venue_id}/{filename}` — the leading path segment is what the bucket's RLS policies check via `storage.foldername(name)`, so any new document-producing feature must keep that convention or its own RLS policy.
- **New venue-adjacent server routes that fetch arbitrary user-submitted URLs must keep the SSRF guard** `app/api/venues/og/route.ts` established (reject non-http(s) schemes and private/loopback/link-local hostnames) — don't fetch a user-submitted URL server-side without it.

## Current State

Phase 0 (Foundation) and Phase 1 (Venue Board) are built and verified end-to-end against the live Supabase project — see [implementation-plan.md](implementation-plan.md) §0 and §4 for exactly what that covers. Auth, locale routing, projects/membership/invites, and the venue board (manual + by-URL, sources/facts/documents/notes tabs) all work. No design system yet — plain neutral shadcn theme throughout, no map/cost-engine/logistics work has started (that's Phases 4–5).

Two pre-existing lint issues predate this work and weren't introduced by it — don't be alarmed by them, and don't casually "fix" them without checking why they're there first: `components/theme-provider.tsx` deliberately sets state inside an effect (avoids a hydration mismatch against the inline theme script that runs before React hydrates — the newer `react-hooks/set-state-in-effect` rule doesn't know that); `app/(auth)/error.tsx` / `app/[lang]/(auth)/error.tsx` have an intentionally-unused `error` prop (Next's error boundary signature requires it even though the UI doesn't display it).

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run i18n:check` | Dry-run — list missing translation keys |
| `npm run i18n:sync` | Translate missing keys via DeepL |
