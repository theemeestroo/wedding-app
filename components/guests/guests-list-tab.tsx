'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import type { Household, TierOption } from '@/components/guests/household-card'
import type { GuestRow, GuestsFilter } from '@/components/guests/shared'
import { RsvpStatusControl, RSVP_STATUSES, type RsvpStatus } from '@/components/guests/rsvp-status-control'

export function GuestsListTab({
  dict,
  households,
  guests,
  tiers,
  existingGroups,
  filter,
  onFilterChange,
}: {
  dict: Dictionary
  households: Household[]
  guests: GuestRow[]
  tiers: TierOption[]
  existingGroups: string[]
  filter: GuestsFilter
  onFilterChange: (filter: GuestsFilter) => void
}) {
  const router = useRouter()
  const supabase = createClient()
  const d = dict.guests.list
  const [search, setSearch] = useState('')

  const householdById = new Map(households.map((h) => [h.id, h]))
  const tierById = new Map(tiers.map((t) => [t.id, t]))

  const searchNorm = search.trim().toLowerCase()

  const rows = guests
    .map((g) => ({ guest: g, household: householdById.get(g.household_id) ?? null }))
    .filter(({ household }) => household !== null)
    .filter(({ guest, household }) => {
      if (filter.tierId && household!.tier_id !== filter.tierId) return false
      if (filter.group && household!.group_label !== filter.group) return false
      if (filter.rsvpStatus && guest.rsvp_status !== filter.rsvpStatus) return false
      if (searchNorm) {
        const haystack = `${guest.first_name} ${guest.last_name ?? ''} ${household!.name}`.toLowerCase()
        if (!haystack.includes(searchNorm)) return false
      }
      return true
    })
    .sort((a, b) => a.household!.name.localeCompare(b.household!.name) || a.guest.first_name.localeCompare(b.guest.first_name))

  async function handleRsvpChange(guestId: string, status: RsvpStatus) {
    await supabase.from('guests').update({ rsvp_status: status }).eq('id', guestId)
    router.refresh()
  }

  const hasActiveFilter = Boolean(filter.tierId || filter.group || filter.rsvpStatus)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={d.searchPlaceholder}
          className="min-w-[12rem] flex-1 rounded-lg border bg-background px-3 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
        />
        <select
          value={filter.tierId ?? ''}
          onChange={(e) => onFilterChange({ ...filter, tierId: e.target.value || null })}
          className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <option value="">{d.filterTier}</option>
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
          <option value="">{d.filterGroup}</option>
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
          <option value="">{d.filterStatus}</option>
          {RSVP_STATUSES.map((s) => (
            <option key={s} value={s}>
              {dict.guests.rsvp[s]}
            </option>
          ))}
        </select>
        {hasActiveFilter && (
          <button
            onClick={() => onFilterChange({ tierId: null, group: null, rsvpStatus: null })}
            className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
          >
            {d.clearFilters}
          </button>
        )}
      </div>

      <div className="overflow-x-auto border">
        <table className="w-full text-sm" aria-label={dict.guests.tabs.list}>
          <thead>
            <tr className="border-b text-left">
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {d.columnName}
              </th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {d.columnHousehold}
              </th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {d.columnTier}
              </th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {d.columnGroup}
              </th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {d.columnChild}
              </th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {d.columnStatus}
              </th>
              <th scope="col" className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {d.columnOrigin}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ guest, household }) => {
              const tier = household!.tier_id ? tierById.get(household!.tier_id) : null
              return (
                <tr key={guest.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5">
                    {guest.first_name} {guest.last_name}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{household!.name}</td>
                  <td className="px-4 py-2.5">
                    {tier ? (
                      <span className="rounded-full border border-primary/25 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                        {tier.label}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">{household!.group_label || '—'}</td>
                  <td className="px-4 py-2.5">
                    {guest.is_child ? (
                      <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {dict.guests.household.childBadge}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <RsvpStatusControl dict={dict} status={guest.rsvp_status} onChange={(status) => handleRsvpChange(guest.id, status)} />
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {[household!.home_city, household!.home_country].filter(Boolean).join(', ') || '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{d.empty}</p>}
      </div>
    </div>
  )
}
