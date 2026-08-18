/**
 * PRD §11.5's "who" panel — the map answers "where", this answers "who".
 * `logistics.clusters` already arrives sorted hardest-first (see
 * lib/journey-engine.ts's computeOptionLogistics), so the hardest-for list
 * is just its head.
 */

import type { OptionLogistics, DifficultyBand } from '@/lib/journey-engine'
import type { AttendanceForecastResult } from '@/lib/attendance-engine'
import type { DroppedPin } from './travel-map'
import type { Dictionary } from '@/lib/i18n'

const DIFFICULTY_BANDS: DifficultyBand[] = ['easy', 'moderate', 'hard', 'blocked']

function fmtHours(h: number) {
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`
}

export function MapSidePanel({
  dict,
  venueName,
  logistics,
  attendanceForecast,
  droppedPin,
}: {
  dict: Dictionary
  venueName: string
  logistics: OptionLogistics
  attendanceForecast: AttendanceForecastResult
  droppedPin: DroppedPin | null
}) {
  const d = dict.compare.map
  const hardest = logistics.clusters.slice(0, 4)

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <h3 className="font-heading text-lg italic">{venueName}</h3>
        <p className="text-sm text-muted-foreground tabular-nums">
          {fmtHours(logistics.totalGuestHours)} {d.guestHoursLabel}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {DIFFICULTY_BANDS.filter((b) => logistics.bandCounts[b] > 0).map((b) => (
          <span key={b} className="rounded-full bg-muted px-2 py-0.5">
            {dict.options.detail.difficultyBandLabels[b]} · {logistics.bandCounts[b]}
          </span>
        ))}
      </div>

      {hardest.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.hardestForHeading}</p>
          <ul className="space-y-1 text-sm">
            {hardest.map((c) => (
              <li key={c.clusterId} className="flex items-center justify-between gap-2">
                <span className="truncate">{c.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {c.journey ? `${fmtHours(c.journey.doorToDoorHours)} · ${c.guestCount}` : c.guestCount}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl bg-muted/30 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.attendanceForecastHeading}</p>
        <p className="mt-1 text-sm tabular-nums">
          {Math.round(attendanceForecast.invitedTotal)} → ~{Math.round(attendanceForecast.expectedTotal)}{' '}
          ({Math.round(attendanceForecast.expectedRate * 100)}%)
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">{d.attendanceForecastCaveat}</p>
      </div>

      {droppedPin && (
        <div className="rounded-xl border border-dashed bg-muted/30 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{d.droppedPinHeading}</p>
          <p className="mt-1 text-sm tabular-nums">
            {fmtHours(droppedPin.totalGuestHours)} {d.guestHoursLabel}
          </p>
          <div className="mt-1 flex flex-wrap gap-1 text-xs">
            {DIFFICULTY_BANDS.filter((b) => droppedPin.bandCounts[b] > 0).map((b) => (
              <span key={b} className="rounded-full bg-background px-2 py-0.5">
                {dict.options.detail.difficultyBandLabels[b]} · {droppedPin.bandCounts[b]}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
