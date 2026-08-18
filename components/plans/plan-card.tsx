'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/locale'
import { isHouseholdIncluded, sumHeadcount, type PlanHousehold, type PlanRules } from '@/lib/guest-plan'
import type { Dictionary } from '@/lib/i18n'
import type { TierOption } from '@/components/guests/household-card'

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
  tiers,
}: {
  dict: Dictionary
  plan: Plan
  households: PlanHousehold[]
  exceptions: Map<string, boolean>
  tiers: TierOption[]
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
          {households.map((h) => {
            const tierLabel = tiers.find((t) => t.id === h.tierId)?.label
            return (
              <li key={h.id} className="flex items-center justify-between text-sm">
                <span>
                  {h.name}
                  {(tierLabel || h.groupLabel) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {[tierLabel, h.groupLabel].filter(Boolean).join(' · ')}
                    </span>
                  )}
                </span>
                <label className="flex items-center gap-1.5 text-xs">
                  <input type="checkbox" checked={isIncluded(h)} onChange={() => toggleException(h)} />
                  {d.includedLabel}
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
