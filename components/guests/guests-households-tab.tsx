'use client'

import { useState } from 'react'
import type { Dictionary } from '@/lib/i18n'
import { interpolate } from '@/lib/locale'
import type { Household, ClusterOption, TierOption } from '@/components/guests/household-card'
import type { GuestRow, GuestsFilter } from '@/components/guests/shared'
import { AddHouseholdForm } from '@/components/guests/add-household-form'
import { HouseholdCard } from '@/components/guests/household-card'
import { RSVP_STATUSES } from '@/components/guests/rsvp-status-control'

type GroupBy = 'tier' | 'group' | 'none'

export function GuestsHouseholdsTab({
  dict,
  projectId,
  households,
  guests,
  tiers,
  clusters,
  existingGroups,
  filter,
  onFilterChange,
}: {
  dict: Dictionary
  projectId: string
  households: Household[]
  guests: GuestRow[]
  tiers: TierOption[]
  clusters: ClusterOption[]
  existingGroups: string[]
  filter: GuestsFilter
  onFilterChange: (filter: GuestsFilter) => void
}) {
  const d = dict.guests
  const [groupBy, setGroupBy] = useState<GroupBy>('tier')

  const guestsByHousehold = new Map<string, GuestRow[]>()
  for (const g of guests) {
    const list = guestsByHousehold.get(g.household_id) ?? []
    list.push(g)
    guestsByHousehold.set(g.household_id, list)
  }

  const nameCounts = new Map<string, number>()
  for (const h of households) nameCounts.set(h.name, (nameCounts.get(h.name) ?? 0) + 1)

  const filtered = households.filter((h) => {
    if (filter.tierId && h.tier_id !== filter.tierId) return false
    if (filter.group && h.group_label !== filter.group) return false
    if (filter.rsvpStatus) {
      const hg = guestsByHousehold.get(h.id) ?? []
      if (!hg.some((g) => g.rsvp_status === filter.rsvpStatus)) return false
    }
    return true
  })

  const hasActiveFilter = Boolean(filter.tierId || filter.group || filter.rsvpStatus)

  let sections: { key: string; label: string; households: Household[] }[]
  if (groupBy === 'tier') {
    sections = [
      ...tiers.map((t) => ({ key: t.id, label: t.label, households: filtered.filter((h) => h.tier_id === t.id) })),
      { key: '__untiered', label: dict.settings.tiers.noTierOption, households: filtered.filter((h) => !h.tier_id) },
    ].filter((s) => s.households.length > 0)
  } else if (groupBy === 'group') {
    sections = [
      ...existingGroups.map((g) => ({ key: g, label: g, households: filtered.filter((h) => h.group_label === g) })),
      { key: '__ungrouped', label: d.overview.ungrouped, households: filtered.filter((h) => !h.group_label) },
    ].filter((s) => s.households.length > 0)
  } else {
    sections = [{ key: '__all', label: '', households: filtered }]
  }

  return (
    <div className="space-y-6">
      <AddHouseholdForm dict={dict} projectId={projectId} tiers={tiers} existingGroups={existingGroups} />

      <div className="flex flex-wrap items-center gap-2 border-b pb-4">
        <select
          value={filter.tierId ?? ''}
          onChange={(e) => onFilterChange({ ...filter, tierId: e.target.value || null })}
          className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <option value="">{d.list.filterTier}</option>
          {tiers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <select
          value={filter.group ?? ''}
          onChange={(e) => onFilterChange({ ...filter, group: e.target.value || null })}
          className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <option value="">{d.list.filterGroup}</option>
          {existingGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={filter.rsvpStatus ?? ''}
          onChange={(e) => onFilterChange({ ...filter, rsvpStatus: (e.target.value || null) as GuestsFilter['rsvpStatus'] })}
          className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <option value="">{d.list.filterStatus}</option>
          {RSVP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {d.rsvp[s]}
            </option>
          ))}
        </select>
        {hasActiveFilter && (
          <button
            onClick={() => onFilterChange({ tierId: null, group: null, rsvpStatus: null })}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {d.list.clearFilters}
          </button>
        )}

        <div className="ml-auto flex items-center gap-1">
          {([
            ['tier', d.households.groupByTier],
            ['group', d.households.groupByGroup],
            ['none', d.households.groupByNone],
          ] as [GroupBy, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setGroupBy(key)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                groupBy === key ? 'border-gold bg-gold/10 text-primary' : 'bg-background text-muted-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {sections.map((s) => (
          <div key={s.key}>
            {groupBy !== 'none' && (
              <h3 className="mb-3 flex items-center gap-2.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">
                <span className="h-px w-5 bg-primary/40" aria-hidden="true" />
                {s.label}
                <span className="font-normal normal-case tracking-normal text-muted-foreground">
                  {interpolate(d.origins.countSummary, {
                    households: s.households.length,
                    guests: s.households.reduce((sum, h) => sum + (guestsByHousehold.get(h.id)?.length ?? 0), 0),
                  })}
                </span>
              </h3>
            )}
            <div className="space-y-3">
              {s.households.map((h) => (
                <HouseholdCard
                  key={h.id}
                  dict={dict}
                  household={h}
                  guests={guestsByHousehold.get(h.id) ?? []}
                  clusters={clusters}
                  tiers={tiers}
                  existingGroups={existingGroups}
                  isDuplicateName={(nameCounts.get(h.name) ?? 0) > 1}
                />
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </div>
    </div>
  )
}
