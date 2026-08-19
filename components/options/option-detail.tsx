'use client'

import { useState } from 'react'
import Link from 'next/link'
import { localizePath } from '@/lib/locale'
import { computeOptionCosts, type CostRuleInput, type OptionEventInput } from '@/lib/cost-engine'
import type { HouseholdClusterInput, ClusterCoordsInput } from '@/lib/journey-engine'
import type { Headcount } from '@/lib/guest-plan'
import type { Dictionary } from '@/lib/i18n'
import { fmt, type RuleRow, type EventRow, type RatingRow, type DecisionRow, type AccommodationRow, type RoomRow, type ArrivalProfileRow, type AllocationRow, type HouseholdRow } from './shared'
import { OptionLogisticsTab } from './option-logistics-tab'
import { OptionAccommodationTab } from './option-accommodation-tab'
import { OptionEventsTab } from './option-events-tab'
import { OptionCostsTab } from './option-costs-tab'
import { OptionDecisionTab } from './option-decision-tab'

type Tab = 'logistics' | 'accommodation' | 'events' | 'costs' | 'decision'

export function OptionDetail({
  lang,
  dict,
  option,
  plan,
  venue,
  enquiryId,
  events,
  rules,
  headcount,
  currency,
  projectId,
  clusters,
  householdClusters,
  households,
  accommodations,
  rooms,
  arrivalProfiles,
  allocations,
  ratings,
  memberNames,
  currentUserId,
  decision,
  canDecide,
}: {
  lang: string
  dict: Dictionary
  option: { id: string; name: string | null }
  plan: { id: string; name: string }
  venue: {
    id: string
    name: string
    archetype: string | null
    locationCity: string | null
    locationCountry: string | null
    latitude: number | null
    longitude: number | null
  }
  enquiryId: string | null
  events: EventRow[]
  rules: RuleRow[]
  headcount: Headcount
  currency: string
  projectId: string
  clusters: ClusterCoordsInput[]
  householdClusters: HouseholdClusterInput[]
  households: HouseholdRow[]
  accommodations: AccommodationRow[]
  rooms: RoomRow[]
  arrivalProfiles: ArrivalProfileRow[]
  allocations: AllocationRow[]
  ratings: RatingRow[]
  memberNames: Record<string, string>
  currentUserId: string
  decision: DecisionRow | null
  canDecide: boolean
}) {
  const d = dict.options.detail
  const [tab, setTab] = useState<Tab>('logistics')

  const ruleInputs: CostRuleInput[] = rules.map((r) => ({
    id: r.id,
    label: r.label,
    basis: r.basis,
    rate: r.rate,
    currency: r.currency,
    minGuests: r.min_guests,
    maxGuests: r.max_guests,
    confidence: r.confidence,
    eventType: r.event_type,
  }))
  const eventInputs: OptionEventInput[] = events.map((e) => ({
    id: e.id,
    eventType: e.event_type,
    attendanceMode: e.attendance_mode,
    attendancePercentage: e.attendance_percentage,
    attendanceAdults: e.attendance_adults,
    attendanceChildren: e.attendance_children,
    nights: e.nights,
    rooms: e.rooms,
    hours: e.hours,
    isPrimary: e.is_primary,
  }))

  // Cheap (a handful of rules) — no need to memoize, and it sidesteps the
  // dependency-array problem of ruleInputs/eventInputs being freshly built
  // on every render anyway.
  const summary = computeOptionCosts(ruleInputs, eventInputs, headcount)

  const barMax = summary.total.high * 1.1 || 1

  const isDecided = decision?.option_id === option.id

  const tabs: { id: Tab; label: string }[] = [
    { id: 'logistics', label: d.tabs.logistics },
    { id: 'accommodation', label: d.tabs.accommodation },
    { id: 'events', label: d.tabs.events },
    { id: 'costs', label: d.tabs.costs },
    { id: 'decision', label: d.tabs.decision },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{plan.name} × {venue.name}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">{option.name || `${plan.name} — ${venue.name}`}</h1>
      </div>

      {summary.mixedCurrency && (
        <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          {d.mixedCurrencyWarning}
        </p>
      )}

      <section className="space-y-3 rounded-2xl border bg-card p-6">
        <div className="flex items-baseline justify-between">
          <span className="text-2xl font-bold tabular-nums">{fmt(summary.total.mid, currency)}</span>
          <span className="text-sm text-muted-foreground tabular-nums">
            {fmt(summary.total.low, currency)} – {fmt(summary.total.high, currency)}
          </span>
        </div>
        <div className="relative h-2 w-full rounded-full bg-muted">
          <div
            className="absolute h-2 rounded-full bg-primary/30"
            style={{
              left: `${(summary.total.low / barMax) * 100}%`,
              width: `${((summary.total.high - summary.total.low) / barMax) * 100}%`,
            }}
          />
          <div className="absolute -top-0.5 h-3 w-0.5 bg-primary" style={{ left: `${(summary.total.mid / barMax) * 100}%` }} />
        </div>
        <p className="text-sm text-muted-foreground">
          {summary.perGuest != null && `${fmt(summary.perGuest, currency)} ${d.perGuest}`}
          {summary.perGuest != null && summary.perAdult != null && ' · '}
          {summary.perAdult != null && `${fmt(summary.perAdult, currency)} ${d.perAdult}`}
        </p>

        {summary.biggestUnknown && (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {d.biggestUnknownIntro} <strong>{summary.biggestUnknown.label}</strong>.
            {enquiryId && (
              <>
                {' '}
                <Link href={localizePath(lang, `/enquiries/${enquiryId}`)} className="underline-offset-4 hover:underline">
                  {d.biggestUnknownCta}
                </Link>
              </>
            )}
          </div>
        )}
      </section>

      {isDecided && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-900">
          {d.decidedBadge}
        </p>
      )}

      {decision && !isDecided && (
        <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          {d.decidedElsewhere}
        </p>
      )}

      <div className="flex gap-1 border-b text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 font-medium transition-colors ${
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {tab === 'logistics' && (
          <OptionLogisticsTab dict={dict} venue={venue} clusters={clusters} householdClusters={householdClusters} />
        )}
        {tab === 'accommodation' && (
          <OptionAccommodationTab
            dict={dict}
            optionId={option.id}
            currency={currency}
            households={households}
            accommodations={accommodations}
            rooms={rooms}
            arrivalProfiles={arrivalProfiles}
            allocations={allocations}
            householdClusters={householdClusters}
          />
        )}
        {tab === 'events' && <OptionEventsTab dict={dict} optionId={option.id} events={events} />}
        {tab === 'costs' && (
          <OptionCostsTab dict={dict} option={option} venue={venue} plan={plan} currency={currency} lines={summary.lines} />
        )}
        {tab === 'decision' && (
          <OptionDecisionTab
            dict={dict}
            option={option}
            projectId={projectId}
            ratings={ratings}
            memberNames={memberNames}
            currentUserId={currentUserId}
            isDecided={isDecided}
            decisionRationale={decision?.rationale ?? null}
            canDecide={canDecide}
          />
        )}
      </div>
    </div>
  )
}
