'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { CostBasis, Confidence, EventType, ComputedLine } from '@/lib/cost-engine'
import { ARCHETYPE_TEMPLATES, type Archetype } from '@/lib/archetype-templates'
import type { Dictionary } from '@/lib/i18n'
import { BASES, CONFIDENCES, EVENT_TYPES, fmt } from './shared'

export function OptionCostsTab({
  dict,
  option,
  venue,
  plan,
  currency,
  lines,
}: {
  dict: Dictionary
  option: { id: string }
  venue: { id: string; archetype: string | null }
  plan: { id: string }
  currency: string
  lines: ComputedLine[]
}) {
  const router = useRouter()
  const d = dict.options.detail
  const supabase = createClient()

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
    <section className="space-y-4">
      {venue.archetype && (
        <button
          onClick={handleApplyTemplate}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {d.applyTemplate}
        </button>
      )}

      <ul className="space-y-2">
        {lines.map((line) => (
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
        {lines.length === 0 && <p className="text-sm text-muted-foreground">{d.noRules}</p>}
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
  )
}
