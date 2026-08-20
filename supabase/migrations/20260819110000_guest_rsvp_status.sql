-- Per-guest RSVP status — manually maintained by the couple as they hear
-- back through whatever channel they actually use. The app never sends an
-- invitation itself (no app-sent email anywhere in this repo, see AGENTS.md)
-- — this is a status record, not an invitation flow. Deliberately
-- informational: lib/guest-plan.ts and the cost engine keep using full
-- invited headcount regardless of this value, same stance as the existing
-- attendance-engine.ts decline-rate heuristic.
alter table wedding.guests
  add column rsvp_status text not null default 'not_invited'
    check (rsvp_status in ('not_invited', 'invited', 'attending', 'declined'));
