-- =============================================================================
-- Phase 7c — Block-priced accommodation
--
-- Phase 7b (see AGENTS.md) deliberately moved cost from the property level
-- down to accommodation_rooms, because a single hotel/villa can have several
-- differently-priced room types. That's correct for a venue like Borgo
-- Pianello's 8 differently-configured apartments — but it left no way to
-- represent a venue that prices exclusive use of the WHOLE property as one
-- number, not per room: Ca' Salva's real proposal is "EUR2,000/night,
-- exclusive use of all 21 beds", one rate regardless of how guests are
-- split across rooms. Forcing that into per-room rates means fabricating
-- room-by-room prices the venue never quoted. Confirmed against the two real
-- venue proposals entered into "Richard and Karlottas Wedding" 2026-08-20:
-- Borgo Pianello is genuinely per-room-capable across 8 apartments, Ca'
-- Salva is genuinely block-only.
--
-- accommodations gains a pricing_mode switch. 'per_room' (the default,
-- preserving Phase 7b's behaviour exactly) means cost lives on each room's
-- nightly_rate, as today. 'block' means cost is block_nightly_rate on the
-- accommodation itself, and accommodation_rooms underneath it become purely
-- allocation/labelling records (who's in "Apartment 3") with no cost
-- meaning of their own — hence nightly_rate there must become nullable.
-- =============================================================================

alter table wedding.accommodations
  add column pricing_mode text not null default 'per_room' check (pricing_mode in ('block', 'per_room')),
  add column block_nightly_rate numeric,
  add column block_currency text,
  add constraint accommodations_block_rate_required
    check (pricing_mode <> 'block' or block_nightly_rate is not null);

alter table wedding.accommodation_rooms
  alter column nightly_rate drop not null;
