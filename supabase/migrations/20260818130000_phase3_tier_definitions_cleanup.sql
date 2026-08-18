-- =============================================================================
-- Phase 3 refinement — tier definitions cleanup (Part 2 of 2: contract)
--
-- Drops the old lettered households.tier / guest_plans.included_tiers
-- columns superseded by 20260818120000_phase3_tier_definitions.sql's
-- tier_id / included_tier_ids. Run this only after that migration has been
-- applied, the app code reading/writing tier_id and included_tier_ids is
-- deployed and confirmed working end-to-end, and the backfilled tier_id
-- values have been spot-checked against the old tier column. Do not run
-- this against an environment still serving the pre-tier_definitions app
-- code — it depends on the old columns.
-- =============================================================================

begin;

alter table wedding.households drop column tier;
alter table wedding.guest_plans drop column included_tiers;

commit;
