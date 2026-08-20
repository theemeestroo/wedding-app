/**
 * Shared types/constants/formatters for the Option detail tabs
 * (option-detail.tsx + option-*-tab.tsx) — split out so five sibling tab
 * components don't each redeclare the same row shapes and formatting
 * helpers.
 */

import type { CostBasis, Confidence, EventType } from '@/lib/cost-engine'
import type { ArrivalWindow } from '@/lib/accommodation-engine'
import type { DifficultyBand } from '@/lib/journey-engine'

export const RATINGS = ['love', 'like', 'neutral', 'dislike'] as const
export type RatingValue = (typeof RATINGS)[number]
export const DIFFICULTY_BANDS: DifficultyBand[] = ['easy', 'moderate', 'hard', 'blocked']
export const ARRIVAL_WINDOWS: ArrivalWindow[] = ['morning', 'afternoon', 'evening', 'night']

export const BASES: CostBasis[] = [
  'fixed', 'per_adult', 'per_guest', 'per_child', 'per_room',
  'per_room_night', 'per_person_night', 'per_hour', 'percent_of_subtotal',
]
export const CONFIDENCES: Confidence[] = ['guess', 'researched', 'confirmed', 'contracted']
export const EVENT_TYPES: EventType[] = ['welcome_dinner', 'wedding_day', 'farewell_brunch', 'other']

export interface RuleRow {
  id: string
  label: string
  basis: CostBasis
  rate: number
  currency: string | null
  min_guests: number | null
  max_guests: number | null
  confidence: Confidence
  event_type: EventType | null
  venue_id: string | null
  guest_plan_id: string | null
  option_id: string | null
}

export interface EventRow {
  id: string
  event_type: EventType
  label: string | null
  event_date: string | null
  attendance_mode: 'full_plan' | 'percentage' | 'fixed_count'
  attendance_percentage: number | null
  attendance_adults: number | null
  attendance_children: number | null
  nights: number | null
  rooms: number | null
  hours: number | null
  is_primary: boolean
}

export interface RatingRow {
  id: string
  profile_id: string
  rating: RatingValue
  note: string | null
}

export interface DecisionRow {
  option_id: string
  rationale: string | null
  decided_at: string
}

export interface AccommodationRow {
  id: string
  name: string
  pricing_mode: 'block' | 'per_room'
  block_nightly_rate: number | null
  block_currency: string | null
}

export interface RoomRow {
  id: string
  accommodation_id: string
  label: string
  room_type: string | null
  capacity_adults: number
  capacity_children: number
  nightly_rate: number | null
  currency: string | null
}

export interface ArrivalProfileRow {
  id: string
  household_id: string
  arrival_date: string | null
  arrival_window: ArrivalWindow | null
  departure_date: string | null
  departure_window: ArrivalWindow | null
  visa_notes: string | null
}

export interface AllocationRow {
  id: string
  household_id: string
  room_id: string
}

export interface HouseholdRow {
  id: string
  name: string
  adultCount: number
  childCount: number
}

export function fmt(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function fmtHours(h: number) {
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`
}
