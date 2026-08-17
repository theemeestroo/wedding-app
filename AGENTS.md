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

## Current State

Phase 0 (Foundation) and Phase 1 (Venue Board) — see [implementation-plan.md](implementation-plan.md) for what those cover. Auth, locale routing, projects/membership/invites, and the venue board are built. No design system yet — plain neutral shadcn theme throughout.

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run i18n:check` | Dry-run — list missing translation keys |
| `npm run i18n:sync` | Translate missing keys via DeepL |
