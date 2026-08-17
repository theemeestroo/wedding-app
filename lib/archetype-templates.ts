/**
 * Hidden cost templates (PRD §9.2) — "mostly content work," not a database
 * table. Selecting a venue's archetype pre-populates its cost rules at
 * `guess` confidence with typical rates; the couple confirms, edits or
 * deletes each line from there. Line-item lists match the PRD's own
 * archetype examples verbatim; rates are illustrative starting points, not
 * researched figures — that's the point of `guess` confidence.
 */

import type { CostBasis, EventType } from './cost-engine'

export type Archetype = 'bare_villa' | 'all_inclusive' | 'hotel'

export interface TemplateLine {
  label: string
  basis: CostBasis
  defaultRate: number
  eventType: EventType | null
}

export const ARCHETYPE_TEMPLATES: Record<Archetype, TemplateLine[]> = {
  bare_villa: [
    { label: 'Venue hire', basis: 'fixed', defaultRate: 8000, eventType: null },
    { label: 'Catering (adults)', basis: 'per_adult', defaultRate: 110, eventType: null },
    { label: 'Catering (children)', basis: 'per_child', defaultRate: 45, eventType: null },
    { label: 'Staff', basis: 'per_guest', defaultRate: 20, eventType: null },
    { label: 'Furniture and tableware hire', basis: 'fixed', defaultRate: 1200, eventType: null },
    { label: 'Marquee or wet-weather cover', basis: 'fixed', defaultRate: 2500, eventType: null },
    { label: 'Generator', basis: 'fixed', defaultRate: 400, eventType: null },
    { label: 'Portable bathrooms', basis: 'fixed', defaultRate: 500, eventType: null },
    { label: 'Lighting', basis: 'fixed', defaultRate: 700, eventType: null },
    { label: 'Cleaning', basis: 'fixed', defaultRate: 450, eventType: null },
    { label: 'Security deposit', basis: 'fixed', defaultRate: 1000, eventType: null },
    { label: 'Licensed planner', basis: 'fixed', defaultRate: 1800, eventType: null },
    { label: 'Music licence', basis: 'fixed', defaultRate: 150, eventType: null },
    { label: 'Tourist tax', basis: 'per_person_night', defaultRate: 3, eventType: null },
    { label: 'Welcome dinner', basis: 'per_guest', defaultRate: 45, eventType: 'welcome_dinner' },
    { label: 'Transport between accommodation and venue', basis: 'per_guest', defaultRate: 15, eventType: null },
  ],
  all_inclusive: [
    { label: 'Package rate', basis: 'fixed', defaultRate: 12000, eventType: null },
    { label: 'Guest overage rate', basis: 'per_guest', defaultRate: 90, eventType: null },
    { label: 'Drinks upgrade', basis: 'per_guest', defaultRate: 35, eventType: null },
    { label: 'Ceremony fee', basis: 'fixed', defaultRate: 900, eventType: null },
    { label: 'Supplier corkage', basis: 'fixed', defaultRate: 300, eventType: null },
    { label: 'Overtime rate', basis: 'per_hour', defaultRate: 250, eventType: null },
  ],
  hotel: [
    { label: 'Minimum spend', basis: 'fixed', defaultRate: 10000, eventType: null },
    { label: 'Room block commitment', basis: 'per_room_night', defaultRate: 140, eventType: null },
    { label: 'Per-person food and beverage', basis: 'per_guest', defaultRate: 95, eventType: null },
    { label: 'Service charge', basis: 'percent_of_subtotal', defaultRate: 12, eventType: null },
    { label: 'AV', basis: 'fixed', defaultRate: 600, eventType: null },
    { label: 'Cake cutting fee', basis: 'fixed', defaultRate: 150, eventType: null },
  ],
}
