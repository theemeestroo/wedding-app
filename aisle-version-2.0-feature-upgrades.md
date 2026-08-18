# Aisle v2.0 — Feature Upgrades

**Version:** 2.0-draft
**Date:** August 2026
**Status:** Idea backlog — not scheduled

---

## 1. Overview

This document collects feature ideas raised during v1.x development that are worth building eventually but were deliberately deferred rather than bundled into the change that prompted them. It starts with one entry and is expected to grow.

---

## 2. Feature Areas

### 2.1 Address lookup for household origins

**Problem:** `home_city` / `home_country` on `wedding.households` (added in Phase 3, see `supabase/migrations/20260817180000_phase3_guests_plans.sql`) are free-text inputs. A couple typing "Manchester" / "United Kingdom" gets geocoded server-side via `app/api/geocode/route.ts` (Nominatim, cached in `wedding.geocode_cache`) — but free text means typos, inconsistent formatting ("UK" vs "United Kingdom" vs "GB"), and no feedback at entry time about whether a location will actually geocode successfully. This shows up downstream: origin clustering (`wedding.recompute_origin_clusters()`) and the Journey/Gateway logistics engine (`lib/journey-engine.ts`) both depend on having usable coordinates for as many households as possible.

**Approach:** replace the two free-text inputs (in `components/guests/add-household-form.tsx`, `components/guests/household-card.tsx`'s edit form, and the CSV import review step in `components/guests/csv-import-flow.tsx`) with a real address-autocomplete field — e.g. Google Places Autocomplete or Mapbox's geocoding/search-box API — that resolves to a place with known-good coordinates as the couple types, rather than free text validated after the fact. This would let `home_city`/`home_country` be set (and `latitude`/`longitude` populated) in the same interaction, removing the separate `/api/geocode` round-trip this data currently needs before it's usable by clustering or the Journey engine.

**Why deferred:** needs a real provider account and API key (Google Places or Mapbox, similar to `NEXT_PUBLIC_MAPTILER_KEY` already used for the Compare page's map — see `docs`/AGENTS.md's map bullet), which wasn't set up as part of the tier/groups work that prompted writing this down. Worth scoping properly (which provider, cost at expected volume, whether it replaces or just feeds `/api/geocode`) rather than bolting on quickly.

**Data model:** no new tables — `households.home_city`/`home_country`/`latitude`/`longitude` already exist and already mean the right thing; this is a UI/input-quality change, not a schema change.
