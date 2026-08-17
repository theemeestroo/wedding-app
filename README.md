# Wedding Decision Platform

Scaffolding for the wedding app, bootstrapped from Letly's generic Next.js/Supabase/i18n infrastructure. See [AGENTS.md](AGENTS.md) for architecture notes and [wedding-decision-platform-prd-v0 4.md](wedding-decision-platform-prd-v0%204.md) for the product spec.

## Setup

```bash
cp .env.local.example .env.local
# Fill in the Supabase project URL/keys — same project as Letly, shared via
# NEXT_PUBLIC_APP_SCHEMA=wedding (Postgres schema isolation, not a separate project).
npm install
npm run dev
```

## What's here

- Supabase auth: login, signup, magic link, password reset, OAuth (Apple/Google) — all wired to the shared Supabase project's `auth.users`.
- Locale-aware routing (`en`/`de`/`fr`) via `proxy.ts`, mirroring Letly's `[lang]` pattern.
- shadcn/ui + Tailwind v4, plain neutral theme (no branding applied yet).

## What's not here yet

Wedding domain model, design system, app shell/navigation, any business logic. See the PRD for scope.
