'use client'

import { useState } from 'react'
import Link from 'next/link'
import { localizePath } from '@/lib/locale'
import { VenueCard, type VenueCardData } from './venue-card'
import type { Dictionary } from '@/lib/i18n'

type StatusFilter = 'all' | VenueCardData['status']

export function VenueBoard({
  lang,
  dict,
  venues,
}: {
  lang: string
  dict: Dictionary
  venues: VenueCardData[]
}) {
  const d = dict.venues.board
  const [filter, setFilter] = useState<StatusFilter>('all')

  const filtered = filter === 'all' ? venues : venues.filter((v) => v.status === filter)
  const filters: StatusFilter[] = ['all', 'considering', 'shortlisted', 'rejected']

  if (venues.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
        <p className="mb-4 text-sm text-muted-foreground">{d.empty}</p>
        <Link
          href={localizePath(lang, '/venues/new')}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent transition-colors duration-300 hover:border-gold"
        >
          {d.addVenue}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-xl bg-muted p-1 text-sm">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 font-medium capitalize transition-all ${
                filter === f ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f === 'all' ? d.filterAll : f}
            </button>
          ))}
        </div>
        <Link
          href={localizePath(lang, '/venues/new')}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent transition-colors duration-300 hover:border-gold"
        >
          {d.addVenue}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((venue) => (
          <VenueCard key={venue.id} venue={venue} lang={lang} />
        ))}
      </div>
    </div>
  )
}
