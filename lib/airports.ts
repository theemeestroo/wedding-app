/**
 * Airport data for the Journey/Gateway engine (PRD §10.3) — real data, not
 * fabricated. Filtered from OurAirports (public domain,
 * https://ourairports.com/data/) to `type` in (large_airport, medium_airport)
 * with `scheduled_service = 'yes'` and a real IATA code: 3,270 of the
 * source's 85,916 rows. `type` drives the connection-count heuristic in
 * lib/journey-engine.ts — it's real airport classification data, not a
 * claim about which specific routes exist between any two airports (that
 * data isn't embedded here, deliberately — see AGENTS.md).
 */

import airportsData from './data/airports.json'

export interface Airport {
  iata: string
  name: string
  lat: number
  lng: number
  type: 'large' | 'medium'
  municipality: string
  country: string
}

export const AIRPORTS = airportsData as Airport[]

/** Great-circle distance in km between two lat/lng points (haversine). */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/**
 * Nearest airport to a point — linear scan. 3,270 rows is trivially fast
 * without spatial indexing (well under a millisecond).
 */
export function findNearestAirport(lat: number, lng: number): { airport: Airport; distanceKm: number } | null {
  let best: { airport: Airport; distanceKm: number } | null = null
  for (const airport of AIRPORTS) {
    const d = distanceKm(lat, lng, airport.lat, airport.lng)
    if (!best || d < best.distanceKm) {
      best = { airport, distanceKm: d }
    }
  }
  return best
}
