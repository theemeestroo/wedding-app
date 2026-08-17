'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { localizePath } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'
import type { DifficultyBand } from '@/lib/journey-engine'

type RatingValue = 'love' | 'like' | 'neutral' | 'dislike'

interface RatingEntry {
  profileId: string
  rating: RatingValue
  name: string
}

export interface CompareOption {
  id: string
  name: string | null
  planName: string
  venueName: string
  totalLow: number
  totalMid: number
  totalHigh: number
  perGuest: number | null
  mixedCurrency: boolean
  headcountTotal: number
  hasVenueCoords: boolean
  totalGuestHours: number | null
  bandCounts: Record<DifficultyBand, number> | null
  myRating: RatingValue | null
  ratings: RatingEntry[]
  isDecided: boolean
  breakEven: number[]
}

const LINE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#db2777', '#65a30d', '#ea580c']
const DIFFICULTY_BANDS: DifficultyBand[] = ['easy', 'moderate', 'hard', 'blocked']

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

function fmtHours(h: number) {
  return h < 1 ? `${Math.round(h * 60)}m` : `${h.toFixed(1)}h`
}

function optionLabel(o: CompareOption) {
  return o.name || `${o.planName} — ${o.venueName}`
}

export function CompareBoard({
  dict,
  lang,
  currency,
  options,
  breakEvenGuestCounts,
}: {
  dict: Dictionary
  lang: string
  currency: string
  options: CompareOption[]
  breakEvenGuestCounts: number[]
}) {
  const d = dict.compare
  const od = dict.options.detail

  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(options.slice(0, Math.min(3, options.length)).map((o) => o.id)),
  )

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedOptions = options.filter((o) => selected.has(o.id))
  const showComparison = selectedOptions.length >= 2
  const hasMixedCurrency = selectedOptions.some((o) => o.mixedCurrency)

  const chartData = breakEvenGuestCounts.map((guestCount, i) => {
    const point: Record<string, number> = { guestCount }
    for (const o of selectedOptions) point[o.id] = o.breakEven[i]
    return point
  })

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">{d.heading}</h1>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.pickHeading}</h2>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => toggle(o.id)}
              className={
                'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ' +
                (selected.has(o.id) ? 'border-primary bg-primary/10' : 'bg-background hover:bg-muted')
              }
            >
              {optionLabel(o)}
            </button>
          ))}
        </div>
      </section>

      {!showComparison ? (
        <p className="text-sm text-muted-foreground">{d.needTwo}</p>
      ) : (
        <>
          <section className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm" aria-label={d.heading}>
              <thead>
                <tr className="border-b">
                  <th scope="col" className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground" />
                  {selectedOptions.map((o) => (
                    <th key={o.id} scope="col" className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="normal-case tracking-normal text-foreground">{optionLabel(o)}</span>
                        {o.isDecided && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-emerald-800">
                            {d.decidedTag}
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.venue}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5">{o.venueName}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.guestPlan}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5">{o.planName}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.guestCount}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5 tabular-nums">{o.headcountTotal}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.totalCost}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5">
                      <span className="font-semibold tabular-nums">{fmt(o.totalMid, currency)}</span>
                      {o.mixedCurrency && ' *'}
                      <div className="text-xs text-muted-foreground tabular-nums">
                        {fmt(o.totalLow, currency)} – {fmt(o.totalHigh, currency)}
                      </div>
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.perGuest}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5 tabular-nums">{o.perGuest != null ? fmt(o.perGuest, currency) : '—'}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.guestHours}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5 tabular-nums">
                      {o.hasVenueCoords ? (o.totalGuestHours != null ? fmtHours(o.totalGuestHours) : '—') : d.noCoordsYet}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.difficulty}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5">
                      {o.bandCounts ? (
                        <div className="flex flex-wrap gap-1 text-xs">
                          {DIFFICULTY_BANDS.filter((b) => o.bandCounts![b] > 0).map((b) => (
                            <span key={b} className="rounded-full bg-muted px-2 py-0.5">
                              {od.difficultyBandLabels[b]} · {o.bandCounts![b]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{d.noCoordsYet}</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.yourRating}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5">{o.myRating ? od.ratingLabels[o.myRating] : d.notRated}</td>
                  ))}
                </tr>
                <tr className="border-b">
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">{d.table.teamRatings}</th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5 text-xs text-muted-foreground">
                      {o.ratings.length === 0
                        ? d.notRated
                        : o.ratings.map((r) => `${r.name || od.unknownMember}: ${od.ratingLabels[r.rating]}`).join(' · ')}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row" className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground"></th>
                  {selectedOptions.map((o) => (
                    <td key={o.id} className="px-4 py-2.5">
                      <Link
                        href={localizePath(lang, `/options/${o.id}`)}
                        className="text-xs font-medium underline-offset-4 hover:underline"
                      >
                        {d.viewOption}
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </section>

          {hasMixedCurrency && <p className="text-xs text-muted-foreground">{d.mixedCurrencyFootnote}</p>}

          <section className="space-y-3">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.breakEvenHeading}</h2>
            <p className="text-sm text-muted-foreground">{d.breakEvenExplainer}</p>
            <div className="h-80 rounded-xl border bg-card p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="guestCount"
                    label={{ value: d.breakEvenGuestsAxis, position: 'insideBottom', offset: -4 }}
                    className="text-xs"
                  />
                  <YAxis
                    tickFormatter={(v: number) => fmt(v, currency)}
                    width={80}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(v) => fmt(Number(v), currency)}
                    labelFormatter={(v) => `${v} ${d.breakEvenGuestsAxis.toLowerCase()}`}
                  />
                  <Legend formatter={(value: string) => {
                    const o = selectedOptions.find((opt) => opt.id === value)
                    return o ? optionLabel(o) : value
                  }} />
                  {selectedOptions.map((o, i) => (
                    <Line
                      key={o.id}
                      type="monotone"
                      dataKey={o.id}
                      stroke={LINE_COLORS[i % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
