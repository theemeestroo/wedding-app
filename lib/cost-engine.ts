/**
 * Cost engine — pure TypeScript, not a Postgres function. See the Phase 4
 * migration's header comment and AGENTS.md for why: this is real branching
 * logic (per-event headcount resolution, two-pass percent-of-subtotal,
 * range computation), a poor fit for a large plpgsql function on what the
 * PRD calls the riskiest phase of the build. Storage/RLS stays in Postgres;
 * evaluation happens here, given already-fetched, already-authorized rows.
 *
 * Validated against implementation-plan.md's paper prototype before this
 * file was written: a €9,000 fixed + €7,200 per-adult/per-child + €1,600
 * per-guest example produces a €17,800 mid total with a €12,480–23,120
 * range, and confirming the catering line (guess→confirmed) narrows the
 * total range by €5,040 while correctly surfacing as "biggest unknown"
 * beforehand. Re-verified live against the real engine, not just by hand.
 */

import type { Headcount } from './guest-plan'

export type CostBasis =
  | 'fixed'
  | 'per_adult'
  | 'per_guest'
  | 'per_child'
  | 'per_room'
  | 'per_room_night'
  | 'per_person_night'
  | 'per_hour'
  | 'percent_of_subtotal'

export type Confidence = 'guess' | 'researched' | 'confirmed' | 'contracted'

export type EventType = 'welcome_dinner' | 'wedding_day' | 'farewell_brunch' | 'other'

export interface CostRuleInput {
  id: string
  label: string
  basis: CostBasis
  rate: number
  currency: string | null
  minGuests: number | null
  maxGuests: number | null
  confidence: Confidence
  eventType: EventType | null
}

export interface OptionEventInput {
  id: string
  eventType: EventType
  attendanceMode: 'full_plan' | 'percentage' | 'fixed_count'
  attendancePercentage: number | null
  attendanceAdults: number | null
  attendanceChildren: number | null
  nights: number | null
  rooms: number | null
  hours: number | null
  isPrimary: boolean
}

interface EvaluableLine {
  ruleId: string
  label: string
  basis: CostBasis
  confidence: Confidence
  currency: string | null
  eventType: EventType | null
  evaluable: true
  amount: number
  low: number
  high: number
}

interface UnevaluableLine {
  ruleId: string
  label: string
  basis: CostBasis
  confidence: Confidence
  currency: string | null
  eventType: EventType | null
  evaluable: false
  reason: 'needs_rooms' | 'needs_nights' | 'needs_rooms_and_nights' | 'needs_hours'
}

export type ComputedLine = EvaluableLine | UnevaluableLine

const VARIANCE: Record<Confidence, number> = {
  guess: 0.4,
  researched: 0.2,
  confirmed: 0.05,
  contracted: 0,
}

interface EventContext {
  adults: number
  children: number
  nights: number | null
  rooms: number | null
  hours: number | null
}

/**
 * A rule tagged with an event_type evaluates against that event's own
 * attendance if the Option has one; otherwise (including event_type=null,
 * meaning "whole option") it falls back to the full guest-plan headcount
 * with no night/room/hour context — graceful degradation for an Option
 * that hasn't set up multi-day breakdown.
 */
function resolveEventContext(
  eventType: EventType | null,
  events: OptionEventInput[],
  fullHeadcount: Headcount,
): EventContext {
  const event = eventType ? events.find((e) => e.eventType === eventType) : undefined

  if (!event) {
    return { adults: fullHeadcount.adults, children: fullHeadcount.children, nights: null, rooms: null, hours: null }
  }

  let adults = fullHeadcount.adults
  let children = fullHeadcount.children
  if (event.attendanceMode === 'percentage' && event.attendancePercentage != null) {
    const fraction = event.attendancePercentage / 100
    adults = Math.round(fullHeadcount.adults * fraction)
    children = Math.round(fullHeadcount.children * fraction)
  } else if (event.attendanceMode === 'fixed_count') {
    adults = event.attendanceAdults ?? 0
    children = event.attendanceChildren ?? 0
  }

  return { adults, children, nights: event.nights, rooms: event.rooms, hours: event.hours }
}

function evaluateNonPercentBasis(
  basis: Exclude<CostBasis, 'percent_of_subtotal'>,
  rate: number,
  ctx: EventContext,
): { amount: number } | { reason: UnevaluableLine['reason'] } {
  const guests = ctx.adults + ctx.children
  switch (basis) {
    case 'fixed':
      return { amount: rate }
    case 'per_adult':
      return { amount: rate * ctx.adults }
    case 'per_guest':
      return { amount: rate * guests }
    case 'per_child':
      return { amount: rate * ctx.children }
    case 'per_room':
      return ctx.rooms == null ? { reason: 'needs_rooms' } : { amount: rate * ctx.rooms }
    case 'per_room_night':
      return ctx.rooms == null || ctx.nights == null
        ? { reason: 'needs_rooms_and_nights' }
        : { amount: rate * ctx.rooms * ctx.nights }
    case 'per_person_night':
      return ctx.nights == null ? { reason: 'needs_nights' } : { amount: rate * guests * ctx.nights }
    case 'per_hour':
      return ctx.hours == null ? { reason: 'needs_hours' } : { amount: rate * ctx.hours }
  }
}

function withinGuestBounds(rule: CostRuleInput, ctx: EventContext): boolean {
  const guests = ctx.adults + ctx.children
  if (rule.minGuests != null && guests < rule.minGuests) return false
  if (rule.maxGuests != null && guests > rule.maxGuests) return false
  return true
}

function toLine(rule: CostRuleInput, amount: number): EvaluableLine {
  const variance = VARIANCE[rule.confidence]
  return {
    ruleId: rule.id,
    label: rule.label,
    basis: rule.basis,
    confidence: rule.confidence,
    currency: rule.currency,
    eventType: rule.eventType,
    evaluable: true,
    amount,
    low: amount * (1 - variance),
    high: amount * (1 + variance),
  }
}

export interface OptionCostSummary {
  lines: ComputedLine[]
  total: { low: number; mid: number; high: number }
  perGuest: number | null
  perAdult: number | null
  biggestUnknown: EvaluableLine | null
  mixedCurrency: boolean
}

export function computeOptionCosts(
  rules: CostRuleInput[],
  events: OptionEventInput[],
  fullHeadcount: Headcount,
): OptionCostSummary {
  // percent_of_subtotal rules are evaluated in a second pass, against the
  // sum of every evaluable non-percentage line — never compounding on each
  // other, so multiple % rules don't produce order-dependent totals.
  const nonPercentRules = rules.filter((r) => r.basis !== 'percent_of_subtotal')
  const percentRules = rules.filter((r) => r.basis === 'percent_of_subtotal')

  const lines: ComputedLine[] = []
  let subtotal = 0

  for (const rule of nonPercentRules) {
    const ctx = resolveEventContext(rule.eventType, events, fullHeadcount)
    if (!withinGuestBounds(rule, ctx)) continue // applies-when not met — correctly excluded, not an error

    const result = evaluateNonPercentBasis(rule.basis as Exclude<CostBasis, 'percent_of_subtotal'>, rule.rate, ctx)
    if ('reason' in result) {
      lines.push({
        ruleId: rule.id,
        label: rule.label,
        basis: rule.basis,
        confidence: rule.confidence,
        currency: rule.currency,
        eventType: rule.eventType,
        evaluable: false,
        reason: result.reason,
      })
      continue
    }

    subtotal += result.amount
    lines.push(toLine(rule, result.amount))
  }

  for (const rule of percentRules) {
    const ctx = resolveEventContext(rule.eventType, events, fullHeadcount)
    if (!withinGuestBounds(rule, ctx)) continue
    lines.push(toLine(rule, (rule.rate / 100) * subtotal))
  }

  const evaluableLines = lines.filter((l): l is EvaluableLine => l.evaluable)
  const total = {
    mid: evaluableLines.reduce((sum, l) => sum + l.amount, 0),
    low: evaluableLines.reduce((sum, l) => sum + l.low, 0),
    high: evaluableLines.reduce((sum, l) => sum + l.high, 0),
  }

  const biggestUnknown =
    evaluableLines
      .filter((l) => l.confidence !== 'contracted')
      .sort((a, b) => b.high - b.low - (a.high - a.low))[0] ?? null

  const currencies = new Set(evaluableLines.map((l) => l.currency).filter((c): c is string => Boolean(c)))

  return {
    lines,
    total,
    perGuest: fullHeadcount.total > 0 ? total.mid / fullHeadcount.total : null,
    perAdult: fullHeadcount.adults > 0 ? total.mid / fullHeadcount.adults : null,
    biggestUnknown,
    mixedCurrency: currencies.size > 1,
  }
}
