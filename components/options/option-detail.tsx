'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { localizePath } from '@/lib/locale'
import { computeOptionCosts, type CostBasis, type Confidence, type EventType, type CostRuleInput, type OptionEventInput } from '@/lib/cost-engine'
import { ARCHETYPE_TEMPLATES, type Archetype } from '@/lib/archetype-templates'
import type { Headcount } from '@/lib/guest-plan'
import type { Dictionary } from '@/lib/i18n'

const BASES: CostBasis[] = [
  'fixed', 'per_adult', 'per_guest', 'per_child', 'per_room',
  'per_room_night', 'per_person_night', 'per_hour', 'percent_of_subtotal',
]
const CONFIDENCES: Confidence[] = ['guess', 'researched', 'confirmed', 'contracted']
const EVENT_TYPES: EventType[] = ['welcome_dinner', 'wedding_day', 'farewell_brunch', 'other']

interface RuleRow {
  id: string
  label: string
  basis: CostBasis
  rate: number
  currency: string | null
  min_guests: number | null
  max_guests: number | null
  confidence: Confidence
  event_type: EventType | null
  venue_id: string | null
  guest_plan_id: string | null
  option_id: string | null
}

interface EventRow {
  id: string
  event_type: EventType
  label: string | null
  event_date: string | null
  attendance_mode: 'full_plan' | 'percentage' | 'fixed_count'
  attendance_percentage: number | null
  attendance_adults: number | null
  attendance_children: number | null
  nights: number | null
  rooms: number | null
  hours: number | null
  is_primary: boolean
}

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

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
}: {
  lang: string
  dict: Dictionary
  option: { id: string; name: string | null }
  plan: { id: string; name: string }
  venue: { id: string; name: string; archetype: string | null }
  enquiryId: string | null
  events: EventRow[]
  rules: RuleRow[]
  headcount: Headcount
  currency: string
}) {
  const router = useRouter()
  const d = dict.options.detail
  const supabase = createClient()

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
  const usedEventTypes = new Set(events.map((e) => e.event_type))

  // --- Events -------------------------------------------------------------
  const [newEventType, setNewEventType] = useState<EventType>(
    EVENT_TYPES.find((t) => !usedEventTypes.has(t)) ?? 'other',
  )

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('option_events').insert({ option_id: option.id, event_type: newEventType, attendance_mode: 'full_plan' })
    router.refresh()
  }

  async function handleUpdateEvent(eventId: string, patch: Partial<EventRow>) {
    await supabase.from('option_events').update(patch).eq('id', eventId)
    router.refresh()
  }

  async function handleDeleteEvent(eventId: string) {
    await supabase.from('option_events').delete().eq('id', eventId)
    router.refresh()
  }

  // --- Rules ----------------------------------------------------------------
  const [ruleLabel, setRuleLabel] = useState('')
  const [ruleBasis, setRuleBasis] = useState<CostBasis>('fixed')
  const [ruleRate, setRuleRate] = useState('')
  const [ruleConfidence, setRuleConfidence] = useState<Confidence>('guess')
  const [ruleEventType, setRuleEventType] = useState<EventType | ''>('')
  const [ruleOwner, setRuleOwner] = useState<'option' | 'venue' | 'guest_plan'>('option')
  const [savingRule, setSavingRule] = useState(false)

  async function handleAddRule(e: React.FormEvent) {
    e.preventDefault()
    if (!ruleLabel.trim() || !ruleRate) return
    setSavingRule(true)

    const owner =
      ruleOwner === 'venue'
        ? { venue_id: venue.id }
        : ruleOwner === 'guest_plan'
          ? { guest_plan_id: plan.id }
          : { option_id: option.id }

    await supabase.from('cost_rules').insert({
      ...owner,
      label: ruleLabel,
      basis: ruleBasis,
      rate: Number(ruleRate),
      currency,
      confidence: ruleConfidence,
      event_type: ruleEventType || null,
    })

    setSavingRule(false)
    setRuleLabel('')
    setRuleRate('')
    router.refresh()
  }

  async function handleDeleteRule(ruleId: string) {
    await supabase.from('cost_rules').delete().eq('id', ruleId)
    router.refresh()
  }

  async function handleApplyTemplate() {
    if (!venue.archetype) return
    const template = ARCHETYPE_TEMPLATES[venue.archetype as Archetype]
    if (!template) return
    await supabase.from('cost_rules').insert(
      template.map((t) => ({
        venue_id: venue.id,
        label: t.label,
        basis: t.basis,
        rate: t.defaultRate,
        currency,
        confidence: 'guess' as const,
        event_type: t.eventType,
      })),
    )
    router.refresh()
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{plan.name} × {venue.name}</p>
        <h1 className="text-2xl font-bold tracking-tight">{option.name || `${plan.name} — ${venue.name}`}</h1>
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

      {venue.archetype && (
        <button
          onClick={handleApplyTemplate}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {d.applyTemplate}
        </button>
      )}

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.eventsHeading}</h2>
        <ul className="space-y-2">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {d.eventTypeLabels[ev.event_type]}
                  {ev.is_primary && <span className="ml-2 text-xs text-muted-foreground">({d.primaryBadge})</span>}
                </span>
                {!ev.is_primary && (
                  <button onClick={() => handleDeleteEvent(ev.id)} className="text-xs text-muted-foreground hover:text-destructive">
                    {dict.common.delete}
                  </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <input
                  type="date"
                  defaultValue={ev.event_date ?? ''}
                  onBlur={(e) => handleUpdateEvent(ev.id, { event_date: e.target.value || null })}
                  className="rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <select
                  defaultValue={ev.attendance_mode}
                  onChange={(e) => handleUpdateEvent(ev.id, { attendance_mode: e.target.value as EventRow['attendance_mode'] })}
                  className="rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  <option value="full_plan">{d.attendanceFullPlan}</option>
                  <option value="percentage">{d.attendancePercentage}</option>
                  <option value="fixed_count">{d.attendanceFixedCount}</option>
                </select>
                {ev.attendance_mode === 'percentage' && (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={ev.attendance_percentage ?? ''}
                    onBlur={(e) => handleUpdateEvent(ev.id, { attendance_percentage: e.target.value ? Number(e.target.value) : null })}
                    placeholder="%"
                    className="w-16 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                )}
                {ev.attendance_mode === 'fixed_count' && (
                  <>
                    <input
                      type="number"
                      min={0}
                      defaultValue={ev.attendance_adults ?? ''}
                      onBlur={(e) => handleUpdateEvent(ev.id, { attendance_adults: e.target.value ? Number(e.target.value) : null })}
                      placeholder={d.adultsPlaceholder}
                      className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                    <input
                      type="number"
                      min={0}
                      defaultValue={ev.attendance_children ?? ''}
                      onBlur={(e) => handleUpdateEvent(ev.id, { attendance_children: e.target.value ? Number(e.target.value) : null })}
                      placeholder={d.childrenPlaceholder}
                      className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                    />
                  </>
                )}
                <input
                  type="number"
                  min={0}
                  defaultValue={ev.nights ?? ''}
                  onBlur={(e) => handleUpdateEvent(ev.id, { nights: e.target.value ? Number(e.target.value) : null })}
                  placeholder={d.nightsPlaceholder}
                  className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <input
                  type="number"
                  min={0}
                  defaultValue={ev.rooms ?? ''}
                  onBlur={(e) => handleUpdateEvent(ev.id, { rooms: e.target.value ? Number(e.target.value) : null })}
                  placeholder={d.roomsPlaceholder}
                  className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <input
                  type="number"
                  min={0}
                  defaultValue={ev.hours ?? ''}
                  onBlur={(e) => handleUpdateEvent(ev.id, { hours: e.target.value ? Number(e.target.value) : null })}
                  placeholder={d.hoursPlaceholder}
                  className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>
            </li>
          ))}
        </ul>

        {usedEventTypes.size < EVENT_TYPES.length && (
          <form onSubmit={handleAddEvent} className="flex items-center gap-2">
            <select
              value={newEventType}
              onChange={(e) => setNewEventType(e.target.value as EventType)}
              className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {EVENT_TYPES.filter((t) => !usedEventTypes.has(t)).map((t) => (
                <option key={t} value={t}>{d.eventTypeLabels[t]}</option>
              ))}
            </select>
            <button type="submit" className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
              {d.addEvent}
            </button>
          </form>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.costLinesHeading}</h2>
        <ul className="space-y-2">
          {summary.lines.map((line) => (
            <li key={line.ruleId} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{line.label}</p>
                <p className="text-xs text-muted-foreground">
                  {d.basisLabels[line.basis]}
                  {line.eventType ? ` · ${d.eventTypeLabels[line.eventType]}` : ''}
                  {' · '}
                  {d.confidenceLabels[line.confidence]}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {line.evaluable ? (
                  <span className="text-sm tabular-nums">{fmt(line.amount, line.currency ?? currency)}</span>
                ) : (
                  <span className="text-xs text-amber-700">{d.unevaluableReasons[line.reason]}</span>
                )}
                <button onClick={() => handleDeleteRule(line.ruleId)} className="text-xs text-muted-foreground hover:text-destructive">
                  {dict.common.delete}
                </button>
              </div>
            </li>
          ))}
          {summary.lines.length === 0 && <p className="text-sm text-muted-foreground">{d.noRules}</p>}
        </ul>

        <form onSubmit={handleAddRule} className="space-y-2 rounded-xl border bg-muted/30 p-4">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={ruleLabel}
              onChange={(e) => setRuleLabel(e.target.value)}
              placeholder={d.ruleLabelPlaceholder}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <input
              type="number"
              step="0.01"
              value={ruleRate}
              onChange={(e) => setRuleRate(e.target.value)}
              placeholder={d.ratePlaceholder}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={ruleBasis}
              onChange={(e) => setRuleBasis(e.target.value as CostBasis)}
              className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {BASES.map((b) => (
                <option key={b} value={b}>{d.basisLabels[b]}</option>
              ))}
            </select>
            <select
              value={ruleConfidence}
              onChange={(e) => setRuleConfidence(e.target.value as Confidence)}
              className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {CONFIDENCES.map((c) => (
                <option key={c} value={c}>{d.confidenceLabels[c]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={ruleEventType}
              onChange={(e) => setRuleEventType(e.target.value as EventType | '')}
              className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="">{d.wholeOption}</option>
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>{d.eventTypeLabels[t]}</option>
              ))}
            </select>
            <select
              value={ruleOwner}
              onChange={(e) => setRuleOwner(e.target.value as typeof ruleOwner)}
              className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <option value="option">{d.ownerOption}</option>
              <option value="venue">{d.ownerVenue}</option>
              <option value="guest_plan">{d.ownerGuestPlan}</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={savingRule}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {savingRule ? dict.common.saving : d.addRule}
          </button>
        </form>
      </section>
    </div>
  )
}
