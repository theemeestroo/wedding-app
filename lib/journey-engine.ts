/**
 * Journey/Gateway engine (PRD §10.3–§10.4) — pure TypeScript, not a Postgres
 * function or table, same reasoning as lib/cost-engine.ts: this is cheap,
 * deterministic math given two sets of coordinates, not something that
 * benefits from a cache table.
 *
 * What this deliberately does NOT do: claim that a specific flight route
 * exists between two specific airports. That data isn't embedded (see
 * lib/airports.ts's header) and guessing it would actively mislead couples
 * about travel difficulty — the opposite of what this feature is for.
 * Connection count is a heuristic off real airport size classification
 * (`large`/`medium`, from OurAirports) plus flight distance, always at
 * `guess` confidence. This matches the PRD's own §10.6 v1 position: even
 * its recommended "static direct-route table, refreshed manually" is a
 * hand-maintained heuristic, not a live, verified route database.
 */

import { findNearestAirport, distanceKm, type Airport } from './airports'

export interface Coordinates {
  lat: number
  lng: number
}

export type TravelMode = 'drive' | 'fly'
export type DifficultyBand = 'easy' | 'moderate' | 'hard' | 'blocked'

export interface JourneyResult {
  mode: TravelMode
  originAirport: Airport | null
  destAirport: Airport | null
  connections: number
  doorToDoorHours: number
  costPerPerson: number
  difficultyBand: DifficultyBand
  distanceKm: number
}

// Below this distance, driving door-to-door is almost always faster and
// simpler than flying once airport transfers and buffers are counted.
export const DRIVE_THRESHOLD_KM = 300

/**
 * Connections heuristic: short-haul is almost always direct; long-haul
 * between two major hubs is often direct too (that's what makes them
 * hubs); everything else picks up a connection, two for very long routes
 * through smaller airports. A heuristic on real airport size, not a claim
 * about any specific route.
 */
export function estimateConnections(flightKm: number, originType: Airport['type'], destType: Airport['type']): number {
  const bothLarge = originType === 'large' && destType === 'large'
  const eitherLarge = originType === 'large' || destType === 'large'

  if (flightKm < 1000) return 0
  if (flightKm < 3000) return bothLarge || eitherLarge ? 0 : 1
  if (flightKm < 6000) return eitherLarge ? 1 : 2
  return bothLarge ? 1 : 2
}

/** distance-band × direct/connection factor, per PRD §9.1/§10.6's own heuristic shape. */
export function estimateFlightCost(flightKm: number, connections: number): number {
  const ratePerKm = flightKm < 1000 ? 0.15 : flightKm < 4000 ? 0.1 : 0.08
  return Math.max(flightKm * ratePerKm, 60) + connections * 50
}

export function bandFor(hours: number, connections: number): DifficultyBand {
  // PRD §10.4's Hard band has no upper bound — a genuinely long-but-real
  // journey (e.g. New York–Sydney, ~24h door-to-door) is still Hard, not
  // Blocked. Blocked means no viable route or a stated maximum exceeded
  // (§10.4) — this app doesn't collect a household's stated max (Phase 3
  // deliberately skipped that optional field), so the only real Blocked
  // trigger in v1 is "no airport data available at all" (see the 999-hour
  // sentinel in computeJourney), not "this journey is merely very long."
  if (hours < 4 && connections === 0) return 'easy'
  if (hours <= 8 && connections <= 1) return 'moderate'
  return 'hard'
}

export interface NearestAirportResult {
  airport: Airport
  distanceKm: number
}

/**
 * The fly-branch of a journey, given already-resolved nearest airports for
 * both ends. Split out from computeJourney() so bulk callers that need the
 * same origin or destination repeated many times (the burden-surface grid in
 * lib/burden-surface-engine.ts — every grid point is a candidate destination)
 * can resolve each unique coordinate's nearest airport once with
 * findNearestAirport() and reuse it, instead of re-scanning all 3,270
 * airports on every pair. computeJourney() itself is unchanged behaviourally
 * — it just calls this after doing its own lookups.
 */
export function computeJourneyFromAirports(
  directKm: number,
  originNearest: NearestAirportResult,
  destNearest: NearestAirportResult,
): JourneyResult {
  const leg1Hours = originNearest.distanceKm / 60 // home -> departure airport
  const leg3Hours = destNearest.distanceKm / 60 // arrival airport -> venue
  const flightKm = distanceKm(
    originNearest.airport.lat,
    originNearest.airport.lng,
    destNearest.airport.lat,
    destNearest.airport.lng,
  )
  const connections = estimateConnections(flightKm, originNearest.airport.type, destNearest.airport.type)
  const flightHours = flightKm / 750 + 1 + connections * 1.5 // cruise speed + takeoff/landing + layovers
  const checkInBufferHours = 2

  const doorToDoorHours = leg1Hours + checkInBufferHours + flightHours + leg3Hours

  return {
    mode: 'fly',
    originAirport: originNearest.airport,
    destAirport: destNearest.airport,
    connections,
    doorToDoorHours,
    costPerPerson: estimateFlightCost(flightKm, connections),
    difficultyBand: bandFor(doorToDoorHours, connections),
    distanceKm: directKm,
  }
}

export function computeJourney(origin: Coordinates, destination: Coordinates): JourneyResult {
  const directKm = distanceKm(origin.lat, origin.lng, destination.lat, destination.lng)

  if (directKm <= DRIVE_THRESHOLD_KM) {
    const hours = directKm / 70 + 0.5 // ~70km/h average + a departure buffer
    return {
      mode: 'drive',
      originAirport: null,
      destAirport: null,
      connections: 0,
      doorToDoorHours: hours,
      costPerPerson: directKm * 0.12, // rough fuel/toll share per person
      difficultyBand: bandFor(hours, 0),
      distanceKm: directKm,
    }
  }

  const originNearest = findNearestAirport(origin.lat, origin.lng)
  const destNearest = findNearestAirport(destination.lat, destination.lng)

  if (!originNearest || !destNearest) {
    return {
      mode: 'fly',
      originAirport: null,
      destAirport: null,
      connections: 0,
      doorToDoorHours: 999,
      costPerPerson: 0,
      difficultyBand: 'blocked',
      distanceKm: directKm,
    }
  }

  return computeJourneyFromAirports(directKm, originNearest, destNearest)
}

// ---------------------------------------------------------------------------
// Aggregation across an Option's origin clusters — guest-hours (PRD §11.2,
// "the headline metric throughout the logistics pillar") and the
// who's-it-hard-for breakdown (§11.5).
// ---------------------------------------------------------------------------

export interface HouseholdClusterInput {
  householdId: string
  clusterId: string | null
  guestCount: number
}

export interface ClusterCoordsInput {
  id: string
  label: string
  lat: number | null
  lng: number | null
}

export interface ClusterLogistics {
  clusterId: string
  label: string
  guestCount: number
  journey: JourneyResult | null // null when the cluster has no centroid yet
}

export interface OptionLogistics {
  totalGuestHours: number
  clusters: ClusterLogistics[]
  bandCounts: Record<DifficultyBand, number>
  unclusteredGuestCount: number
}

export function computeOptionLogistics(
  households: HouseholdClusterInput[],
  clusterCoords: ClusterCoordsInput[],
  venueCoords: Coordinates | null,
): OptionLogistics {
  const clusterMap = new Map(clusterCoords.map((c) => [c.id, c]))
  const guestCountByCluster = new Map<string, number>()
  let unclusteredGuestCount = 0

  for (const h of households) {
    if (h.clusterId && clusterMap.has(h.clusterId)) {
      guestCountByCluster.set(h.clusterId, (guestCountByCluster.get(h.clusterId) ?? 0) + h.guestCount)
    } else {
      unclusteredGuestCount += h.guestCount
    }
  }

  const bandCounts: Record<DifficultyBand, number> = { easy: 0, moderate: 0, hard: 0, blocked: 0 }
  let totalGuestHours = 0
  const clusters: ClusterLogistics[] = []

  for (const [clusterId, guestCount] of guestCountByCluster) {
    const cluster = clusterMap.get(clusterId)!
    let journey: JourneyResult | null = null
    if (venueCoords && cluster.lat != null && cluster.lng != null) {
      journey = computeJourney({ lat: cluster.lat, lng: cluster.lng }, venueCoords)
      totalGuestHours += journey.doorToDoorHours * guestCount
      bandCounts[journey.difficultyBand] += guestCount
    }
    clusters.push({ clusterId, label: cluster.label, guestCount, journey })
  }

  clusters.sort((a, b) => (b.journey?.doorToDoorHours ?? 0) - (a.journey?.doorToDoorHours ?? 0))

  return { totalGuestHours, clusters, bandCounts, unclusteredGuestCount }
}
