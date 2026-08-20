'use client'

import { useState } from 'react'
import type { Dictionary } from '@/lib/i18n'
import type { Household, ClusterOption, TierOption } from '@/components/guests/household-card'
import type { GuestRow, GuestsFilter } from '@/components/guests/shared'
import type { OriginCluster } from '@/components/guests/origin-cluster-panel'
import { GuestsOverviewTab } from '@/components/guests/guests-overview-tab'
import { GuestsHouseholdsTab } from '@/components/guests/guests-households-tab'
import { GuestsListTab } from '@/components/guests/guests-list-tab'
import { GuestsOriginsTab } from '@/components/guests/guests-origins-tab'

type Tab = 'overview' | 'households' | 'list' | 'origins'

export function GuestsTabs({
  dict,
  projectId,
  households,
  guests,
  tiers,
  clusters,
  clustersWithCounts,
  unassignedCount,
  existingGroups,
}: {
  dict: Dictionary
  projectId: string
  households: Household[]
  guests: GuestRow[]
  tiers: TierOption[]
  clusters: ClusterOption[]
  clustersWithCounts: OriginCluster[]
  unassignedCount: number
  existingGroups: string[]
}) {
  const d = dict.guests
  const [tab, setTab] = useState<Tab>('overview')
  const [filter, setFilter] = useState<GuestsFilter>({ tierId: null, group: null, rsvpStatus: null })

  function goToFilteredList(patch: Partial<GuestsFilter>) {
    setFilter((prev) => ({ ...prev, ...patch }))
    setTab('list')
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: d.tabs.overview },
    { id: 'households', label: d.tabs.households },
    { id: 'list', label: d.tabs.list },
    { id: 'origins', label: d.tabs.origins },
  ]

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 font-medium transition-colors ${
              tab === t.id ? 'border-gold text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <GuestsOverviewTab
          dict={dict}
          households={households}
          guests={guests}
          tiers={tiers}
          existingGroups={existingGroups}
          onNavigate={goToFilteredList}
        />
      )}
      {tab === 'households' && (
        <GuestsHouseholdsTab
          dict={dict}
          projectId={projectId}
          households={households}
          guests={guests}
          tiers={tiers}
          clusters={clusters}
          existingGroups={existingGroups}
          filter={filter}
          onFilterChange={setFilter}
        />
      )}
      {tab === 'list' && (
        <GuestsListTab
          dict={dict}
          households={households}
          guests={guests}
          tiers={tiers}
          existingGroups={existingGroups}
          filter={filter}
          onFilterChange={setFilter}
        />
      )}
      {tab === 'origins' && (
        <GuestsOriginsTab dict={dict} projectId={projectId} clusters={clustersWithCounts} unassignedCount={unassignedCount} />
      )}
    </div>
  )
}
