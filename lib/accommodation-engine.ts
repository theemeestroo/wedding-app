/**
 * Accommodation & transfer engine (PRD §10.5's second and third feedback
 * loops: "stay length → accommodation cost" and "arrival profile → transfer
 * costs") — pure TypeScript, not a Postgres function, same reasoning as
 * lib/cost-engine.ts and lib/journey-engine.ts: real branching logic given
 * already-fetched, already-authorized rows, not a good fit for plpgsql.
 *
 * What this deliberately does NOT do: claim a real transport-pricing lookup.
 * computeTransferEstimate is a heuristic on headcount and vehicle capacity,
 * always at `guess` confidence — same honesty framing as journey-engine.ts's
 * flight-cost heuristic. There is no licensed coach/transfer pricing data
 * behind this, and it shouldn't be presented as if there were.
 */

export type ArrivalWindow = 'morning' | 'afternoon' | 'evening' | 'night'

export interface AccommodationInput {
  id: string
  nightlyRate: number | null
  currency: string | null
}

export interface ArrivalProfileInput {
  householdId: string
  arrivalDate: string | null
  arrivalWindow: ArrivalWindow | null
  departureDate: string | null
  departureWindow: ArrivalWindow | null
}

export interface AllocationInput {
  householdId: string
  accommodationId: string
  roomsAssigned: number
}

/**
 * Nights derived from an arrival profile when both dates are set; otherwise
 * defaults to two nights (arrive the day before the wedding, leave the day
 * after) — same graceful-degradation shape resolveEventContext() uses in
 * cost-engine.ts for a missing event. The default is a flat assumption, not
 * anchored to the actual event date, so callers that want to show couples
 * *which* dates were assumed should read isDefaulted off the primary event
 * date they already have from option_events.
 */
function resolveNights(profile: ArrivalProfileInput | undefined): {
  nights: number
  isDefaulted: boolean
} {
  if (profile?.arrivalDate && profile?.departureDate) {
    const arrive = new Date(profile.arrivalDate).getTime()
    const depart = new Date(profile.departureDate).getTime()
    const nights = Math.max(0, Math.round((depart - arrive) / (1000 * 60 * 60 * 24)))
    return { nights, isDefaulted: false }
  }
  return { nights: 2, isDefaulted: true }
}

export interface AccommodationCostBreakdownRow {
  accommodationId: string
  nights: number
  roomsAssigned: number
  amount: number
  currency: string | null
}

export interface AccommodationCostResult {
  total: number
  currency: string | null
  mixedCurrency: boolean
  breakdown: AccommodationCostBreakdownRow[]
  defaultedHouseholdCount: number
}

export function computeAccommodationCost(
  allocations: AllocationInput[],
  arrivalProfiles: ArrivalProfileInput[],
  accommodations: AccommodationInput[],
): AccommodationCostResult {
  const accommodationById = new Map(accommodations.map((a) => [a.id, a]))
  const profileByHousehold = new Map(arrivalProfiles.map((p) => [p.householdId, p]))

  const breakdown: AccommodationCostBreakdownRow[] = []
  let total = 0
  let defaultedHouseholdCount = 0
  const currencies = new Set<string>()

  for (const allocation of allocations) {
    const accommodation = accommodationById.get(allocation.accommodationId)
    if (!accommodation || accommodation.nightlyRate == null) continue

    const { nights, isDefaulted } = resolveNights(profileByHousehold.get(allocation.householdId))
    if (isDefaulted) defaultedHouseholdCount += 1

    const amount = accommodation.nightlyRate * allocation.roomsAssigned * nights
    total += amount
    if (accommodation.currency) currencies.add(accommodation.currency)

    breakdown.push({
      accommodationId: allocation.accommodationId,
      nights,
      roomsAssigned: allocation.roomsAssigned,
      amount,
      currency: accommodation.currency,
    })
  }

  return {
    total,
    currency: accommodations.find((a) => a.currency)?.currency ?? null,
    mixedCurrency: currencies.size > 1,
    breakdown,
    defaultedHouseholdCount,
  }
}

// ---------------------------------------------------------------------------
// Transfer/coach estimate — groups households into arrival "waves" by
// (origin cluster, arrival date, arrival window) and sizes vehicles off
// total headcount per wave. Heuristic, guess-confidence, not a real pricing
// lookup — see the file header.
// ---------------------------------------------------------------------------

export interface HouseholdTransferInput {
  householdId: string
  clusterId: string | null
  guestCount: number
}

const SEATS_PER_COACH = 45
const COST_PER_COACH = 650 // flat heuristic estimate, guess confidence
const COST_PER_CAR = 90 // for waves too small to justify a coach

export interface TransferWave {
  clusterId: string | null
  arrivalDate: string
  arrivalWindow: ArrivalWindow | null
  guestCount: number
  coaches: number
  cars: number
  estimatedCost: number
}

export interface TransferEstimateResult {
  total: number
  waves: TransferWave[]
  unscheduledGuestCount: number
}

export function computeTransferEstimate(
  households: HouseholdTransferInput[],
  arrivalProfiles: ArrivalProfileInput[],
): TransferEstimateResult {
  const profileByHousehold = new Map(arrivalProfiles.map((p) => [p.householdId, p]))

  const waveKey = (clusterId: string | null, date: string, window: ArrivalWindow | null) =>
    `${clusterId ?? 'none'}|${date}|${window ?? 'unspecified'}`
  const waveGuestCounts = new Map<string, { clusterId: string | null; arrivalDate: string; arrivalWindow: ArrivalWindow | null; guestCount: number }>()

  let unscheduledGuestCount = 0

  for (const household of households) {
    const profile = profileByHousehold.get(household.householdId)
    const arrivalDate = profile?.arrivalDate ?? null

    if (!arrivalDate) {
      unscheduledGuestCount += household.guestCount
      continue
    }

    const key = waveKey(household.clusterId, arrivalDate, profile?.arrivalWindow ?? null)
    const existing = waveGuestCounts.get(key)
    if (existing) {
      existing.guestCount += household.guestCount
    } else {
      waveGuestCounts.set(key, {
        clusterId: household.clusterId,
        arrivalDate,
        arrivalWindow: profile?.arrivalWindow ?? null,
        guestCount: household.guestCount,
      })
    }
  }

  const waves: TransferWave[] = []
  let total = 0

  for (const wave of waveGuestCounts.values()) {
    const coaches = Math.floor(wave.guestCount / SEATS_PER_COACH)
    const remainder = wave.guestCount - coaches * SEATS_PER_COACH
    // A remainder too small for a coach to be worth chartering travels by car instead.
    const remainderNeedsCoach = remainder > SEATS_PER_COACH / 2
    const finalCoaches = coaches + (remainderNeedsCoach ? 1 : 0)
    const cars = remainderNeedsCoach || remainder === 0 ? 0 : Math.ceil(remainder / 4)

    const estimatedCost = finalCoaches * COST_PER_COACH + cars * COST_PER_CAR
    total += estimatedCost

    waves.push({
      clusterId: wave.clusterId,
      arrivalDate: wave.arrivalDate,
      arrivalWindow: wave.arrivalWindow,
      guestCount: wave.guestCount,
      coaches: finalCoaches,
      cars,
      estimatedCost,
    })
  }

  waves.sort((a, b) => a.arrivalDate.localeCompare(b.arrivalDate))

  return { total, waves, unscheduledGuestCount }
}
