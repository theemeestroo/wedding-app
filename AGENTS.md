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
- **Every venue always has exactly one enquiry.** A trigger on `wedding.venues` (`supabase/migrations/20260817160000_phase2_enquiry_crm.sql`) creates the `wedding.enquiries` row automatically on insert — never create a venue and its enquiry as two separate app-level steps, and never add a way to delete an enquiry independently of its venue (no delete policy exists on purpose). `wedding.enquiry_project_id(enquiry_id)` extends `venue_project_id()` one level for `enquiry_events`/`quotes` RLS.
- **The inbound-parse email address (PRD §12) is deliberately not built.** It needs a domain that can receive mail plus an inbound-parsing provider account, neither of which exist for this project. Don't build toward a specific provider without asking first — this was an explicit user decision, not an oversight.
- **No app-sent email anywhere in this app.** Both the partner-invite flow (Phase 0) and the enquiry draft-message generator (Phase 2) deliberately stop at "copy the text / open a `mailto:` link" rather than sending on the user's behalf — same reasoning each time (unverified sending domain), stated explicitly in the PRD for enquiries (§12) and applied consistently elsewhere. Keep new outbound-communication features to this shape unless a real email provider gets configured.
- **Tier and group are household-level, not per-guest.** PRD §7's data model tree reads `Guest ── Household ── Tier` — a household shares one tier (A–D) and one optional `group_label`; only name and the child flag vary per guest within it. Don't add per-guest tier/group fields without revisiting this.
- **Origin clustering only ever buckets households with `origin_cluster_id is null`.** `wedding.recompute_origin_clusters()` (`supabase/migrations/20260817180000_phase3_guests_plans.sql`) never reassigns a household that already has a cluster — that's the entire mechanism protecting a couple's manual correction from being silently overwritten by a later recompute. Don't add logic that reassigns already-clustered households without also solving that protection problem properly (a "manually pinned" flag, most likely).
- **The geocode cache (`wedding.geocode_cache`) is global, not project-scoped, and has zero RLS policies on purpose.** `authenticated`/`anon` get nothing; only `app/api/geocode/route.ts`'s admin client (which bypasses RLS) ever touches it. Never query it directly from a browser client — go through that route, which also respects Nominatim's 1 req/sec usage policy for you.
- **Project deletion removes Storage objects before deleting the DB row** (`components/settings/delete-project.tsx`) — Postgres cascades handle every table under `projects`, but `wedding-documents` objects aren't FK-linked, so they need an explicit recursive `list()`/`remove()` walk first (folders show up as `list()` entries with `id: null`, real objects have a non-null `id` — verified live, not just assumed). Any future feature that deletes a venue or project must account for this the same way.

## Current State

Phases 0 (Foundation), 1 (Venue Board), 2 (Enquiry CRM), and 3 (Guests, Plans and Origins) are built and verified end-to-end against the live Supabase project — see [implementation-plan.md](implementation-plan.md) §0 and §4 for exactly what that covers. Auth, locale routing, projects/membership/invites, the venue board, the enquiry pipeline, and now households/guests (manual + CSV import with fuzzy household detection), geocoding, origin clustering, guest plans with tier/group rules and exceptions, and the GDPR deletion/export/notice pieces all work. No design system yet — plain neutral shadcn theme throughout. No map/cost-engine/logistics work has started (that's Phases 4–5) — Phase 3's origin clustering is a simple placeholder grid heuristic, not the gateway-based clustering Phase 5 will replace it with.

Two pre-existing lint issues predate this work and weren't introduced by it — don't be alarmed by them, and don't casually "fix" them without checking why they're there first: `components/theme-provider.tsx` deliberately sets state inside an effect (avoids a hydration mismatch against the inline theme script that runs before React hydrates — the newer `react-hooks/set-state-in-effect` rule doesn't know that); `app/(auth)/error.tsx` / `app/[lang]/(auth)/error.tsx` have an intentionally-unused `error` prop (Next's error boundary signature requires it even though the UI doesn't display it).

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run i18n:check` | Dry-run — list missing translation keys |
| `npm run i18n:sync` | Translate missing keys via DeepL |
