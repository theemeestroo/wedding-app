'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeOptionLogistics, type HouseholdClusterInput, type ClusterCoordsInput } from '@/lib/journey-engine'
import { computeAttendanceForecast } from '@/lib/attendance-engine'
import type { Dictionary } from '@/lib/i18n'
import { DIFFICULTY_BANDS, fmtHours } from './shared'

export function OptionLogisticsTab({
  dict,
  venue,
  clusters,
  householdClusters,
}: {
  dict: Dictionary
  venue: {
    id: string
    locationCity: string | null
    locationCountry: string | null
    latitude: number | null
    longitude: number | null
  }
  clusters: ClusterCoordsInput[]
  householdClusters: HouseholdClusterInput[]
}) {
  const router = useRouter()
  const d = dict.options.detail
  const supabase = createClient()

  const venueCoords = venue.latitude != null && venue.longitude != null
    ? { lat: venue.latitude, lng: venue.longitude }
    : null
  const logistics = computeOptionLogistics(householdClusters, clusters, venueCoords)
  const attendanceForecast = computeAttendanceForecast(logistics.clusters)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeError, setGeocodeError] = useState(false)

  async function handleGeocodeVenue() {
    if (!venue.locationCity || !venue.locationCountry) return
    setGeocoding(true)
    setGeocodeError(false)
    try {
      const res = await fetch(
        `/api/geocode?city=${encodeURIComponent(venue.locationCity)}&country=${encodeURIComponent(venue.locationCountry)}`,
      )
      const geo = await res.json()
      if (geo.ok) {
        await supabase.from('venues').update({ latitude: geo.latitude, longitude: geo.longitude }).eq('id', venue.id)
        router.refresh()
      } else {
        setGeocodeError(true)
      }
    } catch {
      setGeocodeError(true)
    }
    setGeocoding(false)
  }

  return (
    <section className="space-y-4">
      {!venueCoords ? (
        <div className="rounded-xl border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            {venue.locationCity && venue.locationCountry ? d.logisticsNoCoords : d.logisticsNoLocation}
          </p>
          {venue.locationCity && venue.locationCountry && (
            <button
              onClick={handleGeocodeVenue}
              disabled={geocoding}
              className="mt-2 rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
            >
              {geocoding ? dict.common.saving : d.computeTravelData}
            </button>
          )}
          {geocodeError && <p className="mt-2 text-xs text-amber-700">{d.geocodeError}</p>}
        </div>
      ) : logistics.clusters.length === 0 ? (
        <p className="text-sm text-muted-foreground">{d.logisticsNoClusters}</p>
      ) : (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">{d.totalGuestHours}</span>
            <span className="text-lg font-bold tabular-nums">{fmtHours(logistics.totalGuestHours)}</span>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            {DIFFICULTY_BANDS.map((band) =>
              logistics.bandCounts[band] > 0 ? (
                <span
                  key={band}
                  className={
                    'rounded-full px-2.5 py-1 font-medium ' +
                    (band === 'easy'
                      ? 'bg-emerald-50 text-emerald-800'
                      : band === 'moderate'
                        ? 'bg-amber-50 text-amber-800'
                        : band === 'hard'
                          ? 'bg-orange-50 text-orange-800'
                          : 'bg-red-50 text-red-800')
                  }
                >
                  {d.difficultyBandLabels[band]} · {logistics.bandCounts[band]}
                </span>
              ) : null,
            )}
          </div>

          <ul className="divide-y">
            {logistics.clusters.map((c) => (
              <li key={c.clusterId} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 truncate">{c.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {c.journey
                    ? `${d.difficultyBandLabels[c.journey.difficultyBand]} · ${fmtHours(c.journey.doorToDoorHours)} · ${c.guestCount}`
                    : `${d.logisticsNoCentroid} · ${c.guestCount}`}
                </span>
              </li>
            ))}
          </ul>

          {logistics.unclusteredGuestCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {d.unclusteredGuests}: {logistics.unclusteredGuestCount}
            </p>
          )}

          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.attendanceForecastHeading}</p>
            <p className="mt-1 text-sm tabular-nums">
              {Math.round(attendanceForecast.invitedTotal)} → ~{Math.round(attendanceForecast.expectedTotal)}{' '}
              ({Math.round(attendanceForecast.expectedRate * 100)}%)
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">{d.attendanceForecastCaveat}</p>
          </div>
        </div>
      )}
    </section>
  )
}
