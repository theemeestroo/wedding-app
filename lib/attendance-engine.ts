/**
 * Attendance forecast (PRD §10.5's third feedback loop: travel difficulty
 * and cost → expected guest decline) — pure heuristic, informational only.
 * Nothing else in the app consumes this to change a stored number; cost
 * calculations keep using full invited headcount, the safer default for
 * actual budgeting (an optimistic decline assumption under-budgets if
 * wrong). The decline rates below are invented — the PRD gives the concept
 * ("a household facing 11 hours and €890 each declines far more often than
 * one driving 40 minutes") but no numbers, so these are a reasonable
 * starting point, always `guess` confidence, same honesty framing as every
 * other heuristic constant in this codebase (journey-engine.ts's flight-
 * cost rate, accommodation-engine.ts's coach-cost estimate).
 */

import type { ClusterLogistics, DifficultyBand } from './journey-engine'

const DECLINE_RATE: Record<DifficultyBand, number> = {
  easy: 0.05,
  moderate: 0.15,
  hard: 0.3,
  blocked: 0.9,
}

export interface ClusterAttendanceForecast {
  clusterId: string
  label: string
  guestCount: number
  expectedAttending: number
  declineRate: number
}

export interface AttendanceForecastResult {
  invitedTotal: number
  expectedTotal: number
  expectedRate: number
  clusters: ClusterAttendanceForecast[]
}

/** Clusters with no journey yet (venue coordinates not computed) assume full attendance. */
export function computeAttendanceForecast(clusters: ClusterLogistics[]): AttendanceForecastResult {
  const forecastClusters: ClusterAttendanceForecast[] = clusters.map((c) => {
    const declineRate = c.journey ? DECLINE_RATE[c.journey.difficultyBand] : 0
    return {
      clusterId: c.clusterId,
      label: c.label,
      guestCount: c.guestCount,
      expectedAttending: c.guestCount * (1 - declineRate),
      declineRate,
    }
  })

  const invitedTotal = forecastClusters.reduce((sum, c) => sum + c.guestCount, 0)
  const expectedTotal = forecastClusters.reduce((sum, c) => sum + c.expectedAttending, 0)

  return {
    invitedTotal,
    expectedTotal,
    expectedRate: invitedTotal > 0 ? expectedTotal / invitedTotal : 0,
    clusters: forecastClusters,
  }
}
