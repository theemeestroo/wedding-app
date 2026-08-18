/**
 * Burden surface, centre of gravity, and coverage rings (PRD §11) — pure
 * TypeScript, computed client-side on demand, same reasoning as every other
 * engine in this app (lib/cost-engine.ts, lib/journey-engine.ts,
 * lib/accommodation-engine.ts): cheap deterministic math given already-
 * fetched rows, no caching layer exists anywhere in this app yet.
 *
 * The expensive part of a burden surface is airport lookups: naively calling
 * computeJourney() once per (grid point × cluster) pair would re-scan all
 * 3,270 airports (lib/airports.ts's findNearestAirport()) up to twice per
 * call, thousands of times over. Instead, findNearestAirport() is called
 * once per *unique coordinate* — each grid point once, each cluster once —
 * and the per-pair hour math reuses that lookup via
 * computeJourneyFromAirports() (lib/journey-engine.ts), which holds the
 * exact same fly-branch formula computeJourney() itself uses. This keeps the
 * total airport-scan count at roughly (grid points + clusters), not
 * (grid points × clusters × 2).
 *
 * Coverage rings ship as true circles, not real irregular contours — an
 * explicit PRD §11.3 v1 shortcut ("ship true circles with an explicit
 * caveat in the legend, and upgrade later"), not a corner cut taken
 * silently. The coverage percentages are still real, computed from actual
 * per-cluster journeys to the centre of gravity; only the ring *shape* is
 * simplified. A ring's radius is set to the distance of the farthest
 * cluster still within its threshold, so the circle honestly bounds the
 * guests it claims to cover rather than being an arbitrary round number.
 */

import { distanceKm, findNearestAirport } from './airports'
import {
  computeJourney,
  computeJourneyFromAirports,
  bandFor,
  DRIVE_THRESHOLD_KM,
  type Coordinates,
  type DifficultyBand,
  type NearestAirportResult,
} from './journey-engine'

export interface WeightedCluster {
  id: string
  lat: number
  lng: number
  guestCount: number
}

/**
 * Joins an Option's per-household cluster assignments (already computed for
 * the cost/logistics engines) with cluster centroids into the flat, venue-
 * independent shape this file's functions consume. Clusters with no
 * centroid yet, or with zero guests once household counts are summed, are
 * dropped — same "unclustered" exclusion journey-engine.ts's
 * computeOptionLogistics already applies.
 */
export function toWeightedClusters(
  householdClusters: { clusterId: string | null; guestCount: number }[],
  clusterCoords: { id: string; lat: number | null; lng: number | null }[],
): WeightedCluster[] {
  const coordsById = new Map(clusterCoords.map((c) => [c.id, c]))
  const guestCountByCluster = new Map<string, number>()

  for (const h of householdClusters) {
    if (!h.clusterId) continue
    guestCountByCluster.set(h.clusterId, (guestCountByCluster.get(h.clusterId) ?? 0) + h.guestCount)
  }

  const result: WeightedCluster[] = []
  for (const [clusterId, guestCount] of guestCountByCluster) {
    const coords = coordsById.get(clusterId)
    if (coords?.lat != null && coords?.lng != null && guestCount > 0) {
      result.push({ id: clusterId, lat: coords.lat, lng: coords.lng, guestCount })
    }
  }
  return result
}

/** Headcount-weighted centroid of the guest base (PRD §11.1). */
export function computeCentreOfGravity(clusters: WeightedCluster[]): Coordinates | null {
  const totalGuests = clusters.reduce((sum, c) => sum + c.guestCount, 0)
  if (totalGuests === 0) return null

  return {
    lat: clusters.reduce((sum, c) => sum + c.lat * c.guestCount, 0) / totalGuests,
    lng: clusters.reduce((sum, c) => sum + c.lng * c.guestCount, 0) / totalGuests,
  }
}

function hoursAndBandTo(
  cluster: WeightedCluster,
  point: Coordinates,
  pointNearest: NearestAirportResult | null,
  clusterNearest: NearestAirportResult | null,
): { hours: number; band: DifficultyBand } {
  const directKm = distanceKm(cluster.lat, cluster.lng, point.lat, point.lng)

  if (directKm <= DRIVE_THRESHOLD_KM) {
    const hours = directKm / 70 + 0.5
    return { hours, band: bandFor(hours, 0) }
  }

  if (!pointNearest || !clusterNearest) {
    return { hours: 999, band: 'blocked' }
  }

  const journey = computeJourneyFromAirports(directKm, clusterNearest, pointNearest)
  return { hours: journey.doorToDoorHours, band: journey.difficultyBand }
}

// ---------------------------------------------------------------------------
// Burden surface (Layer 2) — total guest-hours if the wedding were held at
// each sampled grid point.
// ---------------------------------------------------------------------------

export interface GridBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface BurdenGridResult {
  bounds: GridBounds
  cols: number
  rows: number
  /** Row-major, length cols*rows — total guest-hours at each sampled point. */
  values: number[]
  minValue: number
  maxValue: number
  /** The grid point with the lowest total guest-hours — the gap-line's "optimum". */
  optimum: Coordinates
}

/**
 * Samples a grid across the clusters' bounding box (padded 25% so the
 * surface doesn't crop right at the outermost cluster) and computes total
 * guest-hours at each point. `targetPoints` is a target, not exact — rows/
 * cols are chosen from it adapted to the box's aspect ratio.
 */
export function computeBurdenGrid(clusters: WeightedCluster[], targetPoints = 300): BurdenGridResult | null {
  if (clusters.length === 0) return null

  const lats = clusters.map((c) => c.lat)
  const lngs = clusters.map((c) => c.lng)
  const rawLatSpan = Math.max(...lats) - Math.min(...lats)
  const rawLngSpan = Math.max(...lngs) - Math.min(...lngs)
  // A single cluster (or several at the same point) has zero span — give it
  // a nominal ~200km window so the grid isn't degenerate.
  const latSpan = Math.max(rawLatSpan, 2)
  const lngSpan = Math.max(rawLngSpan, 2)
  const padLat = latSpan * 0.25
  const padLng = lngSpan * 0.25

  const bounds: GridBounds = {
    minLat: Math.min(...lats) - padLat,
    maxLat: Math.max(...lats) + padLat,
    minLng: Math.min(...lngs) - padLng,
    maxLng: Math.max(...lngs) + padLng,
  }

  const aspect = (bounds.maxLng - bounds.minLng) / (bounds.maxLat - bounds.minLat || 1)
  const rows = Math.max(2, Math.round(Math.sqrt(targetPoints / aspect)))
  const cols = Math.max(2, Math.round(rows * aspect))

  const clusterNearestById = new Map<string, NearestAirportResult | null>(
    clusters.map((c) => [c.id, findNearestAirport(c.lat, c.lng)]),
  )

  const values: number[] = []
  let minValue = Infinity
  let maxValue = -Infinity
  let optimum: Coordinates = { lat: bounds.minLat, lng: bounds.minLng }

  for (let row = 0; row < rows; row++) {
    const lat = bounds.minLat + (row / (rows - 1 || 1)) * (bounds.maxLat - bounds.minLat)
    for (let col = 0; col < cols; col++) {
      const lng = bounds.minLng + (col / (cols - 1 || 1)) * (bounds.maxLng - bounds.minLng)
      const point: Coordinates = { lat, lng }
      const pointNearest = findNearestAirport(lat, lng)

      let total = 0
      for (const cluster of clusters) {
        const { hours } = hoursAndBandTo(cluster, point, pointNearest, clusterNearestById.get(cluster.id) ?? null)
        total += hours * cluster.guestCount
      }

      values.push(total)
      if (total < minValue) {
        minValue = total
        optimum = point
      }
      if (total > maxValue) maxValue = total
    }
  }

  return { bounds, cols, rows, values, minValue, maxValue, optimum }
}

// ---------------------------------------------------------------------------
// Drop-a-pin (PRD §11.4) — same per-point computation as one grid cell,
// exposed standalone with a difficulty-band breakdown for the click tooltip.
// ---------------------------------------------------------------------------

export interface PointBreakdown {
  totalGuestHours: number
  bandCounts: Record<DifficultyBand, number>
}

export function computePointBreakdown(point: Coordinates, clusters: WeightedCluster[]): PointBreakdown {
  const pointNearest = findNearestAirport(point.lat, point.lng)
  const bandCounts: Record<DifficultyBand, number> = { easy: 0, moderate: 0, hard: 0, blocked: 0 }
  let totalGuestHours = 0

  for (const cluster of clusters) {
    const clusterNearest = findNearestAirport(cluster.lat, cluster.lng)
    const { hours, band } = hoursAndBandTo(cluster, point, pointNearest, clusterNearest)
    totalGuestHours += hours * cluster.guestCount
    bandCounts[band] += cluster.guestCount
  }

  return { totalGuestHours, bandCounts }
}

// ---------------------------------------------------------------------------
// Coverage rings (Layer 3) — true circles, see file header.
// ---------------------------------------------------------------------------

export interface CoverageRing {
  thresholdHours: number
  coveragePercent: number
  radiusKm: number
}

export function computeCoverageRings(
  clusters: WeightedCluster[],
  centre: Coordinates,
  thresholds: number[] = [4, 6, 8],
): CoverageRing[] {
  const totalGuests = clusters.reduce((sum, c) => sum + c.guestCount, 0)
  if (totalGuests === 0) return []

  const clusterJourneys = clusters.map((c) => ({
    guestCount: c.guestCount,
    distanceKm: distanceKm(c.lat, c.lng, centre.lat, centre.lng),
    hours: computeJourney({ lat: c.lat, lng: c.lng }, centre).doorToDoorHours,
  }))

  return thresholds.map((thresholdHours) => {
    const within = clusterJourneys.filter((c) => c.hours <= thresholdHours)
    const coveredGuests = within.reduce((sum, c) => sum + c.guestCount, 0)
    const radiusKm = within.length > 0 ? Math.max(...within.map((c) => c.distanceKm)) : 0
    return { thresholdHours, coveragePercent: (coveredGuests / totalGuests) * 100, radiusKm }
  })
}
