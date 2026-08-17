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
- **i18n routing**: same `[lang]` pattern as Letly — every route exists under both `app/(group)/` (English-only fallback) and `app/[lang]/(group)/` (locale-aware). Translations live in `messages/{en,de,fr}.json`; run `npm run i18n:sync` after adding keys to `en.json` (requires `DEEPL_API_KEY`).

## Current State

Scaffolding only: Supabase auth (login/signup/reset-password), locale routing, and a placeholder dashboard. No wedding domain model, no design system, no app shell yet.

## Key Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run i18n:check` | Dry-run — list missing translation keys |
| `npm run i18n:sync` | Translate missing keys via DeepL |
