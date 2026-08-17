'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/locale'
import { isHouseholdIncluded, sumHeadcount, type PlanHousehold, type PlanRules } from '@/lib/guest-plan'
import type { Dictionary } from '@/lib/i18n'

export type { PlanHousehold }

export interface Plan extends PlanRules {
  id: string
  name: string
}

export function PlanCard({
  dict,
  plan,
  households,
  exceptions,
}: {
  dict: Dictionary
  plan: Plan
  households: PlanHousehold[]
  exceptions: Map<string, boolean>
}) {
  const router = useRouter()
  const d = dict.plans.card
  const supabase = createClient()
  const [expanded, setExpanded] = useState(false)

  function isIncluded(h: PlanHousehold): boolean {
    return isHouseholdIncluded(h, plan, exceptions)
  }

  const includedHouseholds = households.filter(isIncluded)
  const { total: guestCount } = sumHeadcount(includedHouseholds)

  async function toggleException(h: PlanHousehold) {
    const current = isIncluded(h)
    if (exceptions.has(h.id) && exceptions.get(h.id) === !current) {
      // Toggling back to the base rule removes the exception row entirely.
      await supabase.from('guest_plan_exceptions').delete().eq('guest_plan_id', plan.id).eq('household_id', h.id)
    } else {
      await supabase
        .from('guest_plan_exceptions')
        .upsert(
          { guest_plan_id: plan.id, household_id: h.id, include: !current },
          { onConflict: 'guest_plan_id,household_id' },
        )
    }
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm(d.confirmDelete)) return
    await supabase.from('guest_plans').delete().eq('id', plan.id)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{plan.name}</h3>
          <p className="text-sm text-muted-foreground">
            {interpolate(d.headcount, { guests: guestCount, households: includedHouseholds.length })}
          </p>
        </div>
        <button onClick={handleDelete} className="shrink-0 text-xs text-muted-foreground hover:text-destructive">
          {dict.common.delete}
        </button>
      </div>

      <button onClick={() => setExpanded((v) => !v)} className="mt-3 text-xs font-medium text-primary underline-offset-4 hover:underline">
        {expanded ? d.hideDetails : d.showDetails}
      </button>

      {expanded && (
        <ul className="mt-3 space-y-1.5 border-t pt-3">
          {households.map((h) => (
            <li key={h.id} className="flex items-center justify-between text-sm">
              <span>
                {h.name}
                <span className="ml-2 text-xs text-muted-foreground">
                  {dict.guests.tierLabel} {h.tier}
                  {h.groupLabel ? ` · ${h.groupLabel}` : ''}
                </span>
              </span>
              <label className="flex items-center gap-1.5 text-xs">
                <input type="checkbox" checked={isIncluded(h)} onChange={() => toggleException(h)} />
                {d.includedLabel}
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
