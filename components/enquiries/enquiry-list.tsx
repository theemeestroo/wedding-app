'use client'

import { useState } from 'react'
import Link from 'next/link'
import { localizePath, interpolate } from '@/lib/locale'
import { EnquiryStatusBadge, ENQUIRY_STATUSES, type EnquiryStatus } from './enquiry-status-badge'
import type { Dictionary } from '@/lib/i18n'

export interface EnquiryListItem {
  id: string
  venueId: string
  venueName: string
  status: EnquiryStatus
  followUpDate: string | null
  daysSinceLastEvent: number | null
}

export function EnquiryList({
  lang,
  dict,
  enquiries,
}: {
  lang: string
  dict: Dictionary
  enquiries: EnquiryListItem[]
}) {
  const d = dict.enquiries.list
  const [filter, setFilter] = useState<'all' | EnquiryStatus>('all')

  const today = new Date().toISOString().slice(0, 10)
  const needsFollowUp = enquiries.filter((e) => e.followUpDate && e.followUpDate <= today)
  const awaitingTooLong = enquiries.filter(
    (e) => (e.status === 'sent' || e.status === 'awaiting_response') && (e.daysSinceLastEvent ?? 0) >= 5,
  )

  const filtered = filter === 'all' ? enquiries : enquiries.filter((e) => e.status === filter)

  return (
    <div className="space-y-8">
      {(needsFollowUp.length > 0 || awaitingTooLong.length > 0) && (
        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            {d.needsAttentionHeading}
          </h2>
          <ul className="space-y-1.5 text-sm">
            {awaitingTooLong.map((e) => (
              <li key={e.id}>
                <Link href={localizePath(lang, `/enquiries/${e.id}`)} className="font-medium text-primary underline-offset-4 hover:underline">
                  {e.venueName}
                </Link>
                {' — '}
                {interpolate(d.awaitingReplyFor, { count: e.daysSinceLastEvent ?? 0 })}
              </li>
            ))}
            {needsFollowUp.map((e) => (
              <li key={e.id}>
                <Link href={localizePath(lang, `/enquiries/${e.id}`)} className="font-medium text-primary underline-offset-4 hover:underline">
                  {e.venueName}
                </Link>
                {' — '}
                {d.followUpDue}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1 text-sm">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
            filter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {d.filterAll}
        </button>
        {ENQUIRY_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
              filter === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {dict.enquiries.statuses[s]}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{d.empty}</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((e) => (
            <li key={e.id}>
              <Link
                href={localizePath(lang, `/enquiries/${e.id}`)}
                className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 transition-shadow hover:shadow-md"
              >
                <span className="font-medium">{e.venueName}</span>
                <div className="flex items-center gap-3">
                  {e.followUpDate && (
                    <span className="text-xs text-muted-foreground">
                      {interpolate(d.followUpOn, { date: e.followUpDate })}
                    </span>
                  )}
                  <EnquiryStatusBadge dict={dict} status={e.status} />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
