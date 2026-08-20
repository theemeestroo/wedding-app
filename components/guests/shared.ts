import type { RsvpStatus } from '@/components/guests/rsvp-status-control'

/** A flat guest row (unlike HouseholdGuest in household-card.tsx, this carries
 *  household_id — needed by the Overview and Guest List tabs, which look
 *  across every household at once rather than rendering one at a time. */
export interface GuestRow {
  id: string
  household_id: string
  first_name: string
  last_name: string | null
  is_child: boolean
  rsvp_status: RsvpStatus
}

/** Filter state shared across the Households and Guest List tabs, and set
 *  by clicking a breakdown row in the Overview tab. */
export interface GuestsFilter {
  tierId: string | null
  group: string | null
  rsvpStatus: RsvpStatus | null
}
