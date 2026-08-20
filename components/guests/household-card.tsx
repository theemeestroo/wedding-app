'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import { RsvpStatusControl, type RsvpStatus } from '@/components/guests/rsvp-status-control'

// Graduated visual weight by tier position — the first-defined tier reads
// heaviest, the last lightest — so the list telegraphs priority at a glance,
// not just on hover. Works for any number of user-defined tiers, not a fixed
// four, by bucketing relative sort position across the same 4 intensity steps.
const TIER_BADGE_STEPS = [
  'border-primary bg-primary text-primary-foreground',
  'border-primary/50 bg-primary/15 text-primary',
  'border-primary/30 bg-primary/5 text-primary/80',
  'border-border bg-muted text-muted-foreground',
]

function tierBadgeStyle(sortOrder: number, tierCount: number) {
  const step = Math.round((sortOrder / Math.max(tierCount - 1, 1)) * (TIER_BADGE_STEPS.length - 1))
  return TIER_BADGE_STEPS[Math.min(step, TIER_BADGE_STEPS.length - 1)]
}

export interface HouseholdGuest {
  id: string
  first_name: string
  last_name: string | null
  is_child: boolean
  rsvp_status: RsvpStatus
}

export interface Household {
  id: string
  name: string
  home_city: string | null
  home_country: string | null
  tier_id: string | null
  group_label: string | null
  origin_cluster_id: string | null
}

export interface ClusterOption {
  id: string
  label: string
}

export interface TierOption {
  id: string
  label: string
  sortOrder: number
}

export function HouseholdCard({
  dict,
  household,
  guests,
  clusters,
  tiers,
  existingGroups,
  isDuplicateName = false,
}: {
  dict: Dictionary
  household: Household
  guests: HouseholdGuest[]
  clusters: ClusterOption[]
  tiers: TierOption[]
  existingGroups: string[]
  isDuplicateName?: boolean
}) {
  const router = useRouter()
  const d = dict.guests.household
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(household.name)
  const [city, setCity] = useState(household.home_city ?? '')
  const [country, setCountry] = useState(household.home_country ?? '')
  const [tierId, setTierId] = useState(household.tier_id ?? '')
  const [groupLabel, setGroupLabel] = useState(household.group_label ?? '')
  const [saving, setSaving] = useState(false)

  const [newGuestFirst, setNewGuestFirst] = useState('')
  const [newGuestLast, setNewGuestLast] = useState('')
  const [newGuestChild, setNewGuestChild] = useState(false)

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    let latitude: number | null = null
    let longitude: number | null = null
    const cityChanged = city !== household.home_city || country !== household.home_country

    if (cityChanged && city.trim() && country.trim()) {
      try {
        const res = await fetch(`/api/geocode?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`)
        const geo = await res.json()
        if (geo.ok) {
          latitude = geo.latitude
          longitude = geo.longitude
        }
      } catch {
        // Non-fatal — see AddHouseholdForm for the same reasoning.
      }
    }

    await supabase
      .from('households')
      .update({
        name: name.trim() || household.name,
        home_city: city || null,
        home_country: country || null,
        tier_id: tierId || null,
        group_label: groupLabel || null,
        ...(cityChanged ? { latitude, longitude } : {}),
      })
      .eq('id', household.id)

    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  async function handleClusterChange(clusterId: string) {
    await supabase
      .from('households')
      .update({ origin_cluster_id: clusterId || null })
      .eq('id', household.id)
    router.refresh()
  }

  async function handleAddGuest(e: React.FormEvent) {
    e.preventDefault()
    if (!newGuestFirst.trim()) return
    await supabase.from('guests').insert({
      household_id: household.id,
      first_name: newGuestFirst,
      last_name: newGuestLast || null,
      is_child: newGuestChild,
    })
    setNewGuestFirst('')
    setNewGuestLast('')
    setNewGuestChild(false)
    router.refresh()
  }

  async function handleDeleteGuest(guestId: string) {
    await supabase.from('guests').delete().eq('id', guestId)
    router.refresh()
  }

  async function handleRsvpChange(guestId: string, status: RsvpStatus) {
    await supabase.from('guests').update({ rsvp_status: status }).eq('id', guestId)
    router.refresh()
  }

  async function handleMarkAllAttending() {
    await supabase.from('guests').update({ rsvp_status: 'attending' }).eq('household_id', household.id)
    router.refresh()
  }

  async function handleDeleteHousehold() {
    if (!confirm(d.confirmDelete)) return
    await supabase.from('households').delete().eq('id', household.id)
    router.refresh()
  }

  const tier = tiers.find((t) => t.id === household.tier_id) ?? null

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading text-lg italic tracking-tight">{household.name}</h3>
              {isDuplicateName && (
                <span
                  title={d.duplicateNameWarning}
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold/20 text-[10px] font-bold text-gold"
                  aria-label={d.duplicateNameWarning}
                >
                  !
                </span>
              )}
              {tier && (
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${tierBadgeStyle(tier.sortOrder, tiers.length)}`}
                >
                  {tier.label}
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {[household.home_city, household.home_country].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>
        {household.group_label && (
          <span className="shrink-0 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            {household.group_label}
          </span>
        )}
      </div>

      <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
        {guests.map((g) => (
          <li key={g.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>
              {g.first_name} {g.last_name}
              {g.is_child && (
                <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {d.childBadge}
                </span>
              )}
            </span>
            <div className="flex shrink-0 items-center gap-3">
              <RsvpStatusControl dict={dict} status={g.rsvp_status} onChange={(status) => handleRsvpChange(g.id, status)} />
              <button onClick={() => handleDeleteGuest(g.id)} className="text-xs text-muted-foreground hover:text-destructive">
                {dict.common.delete}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {guests.length > 1 && (
        <button
          onClick={handleMarkAllAttending}
          className="mt-2 text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline"
        >
          {d.markAllAttending}
        </button>
      )}

      <form onSubmit={handleAddGuest} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newGuestFirst}
          onChange={(e) => setNewGuestFirst(e.target.value)}
          placeholder={d.firstNamePlaceholder}
          className="w-32 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
        />
        <input
          type="text"
          value={newGuestLast}
          onChange={(e) => setNewGuestLast(e.target.value)}
          placeholder={d.lastNamePlaceholder}
          className="w-32 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input type="checkbox" checked={newGuestChild} onChange={(e) => setNewGuestChild(e.target.checked)} />
          {d.childBadge}
        </label>
        <button type="submit" className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
          {d.addGuest}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
        <select
          value={household.origin_cluster_id ?? ''}
          onChange={(e) => handleClusterChange(e.target.value)}
          className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
        >
          <option value="">{d.unassignedCluster}</option>
          {clusters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setEditing((v) => !v)}
          className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium hover:bg-muted"
        >
          {editing ? d.cancelEdit : d.editHousehold}
        </button>
        <button
          onClick={handleDeleteHousehold}
          className="ml-auto rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          {d.deleteHousehold}
        </button>
      </div>

      {editing && (
        <form onSubmit={handleSaveEdit} className="mt-3 space-y-2 rounded-xl border bg-muted/30 p-3">
          <div>
            <label htmlFor={`household-name-${household.id}`} className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {d.nameLabel}
            </label>
            <input
              id={`household-name-${household.id}`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={dict.guests.addHousehold.cityPlaceholder}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
            />
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={dict.guests.addHousehold.countryPlaceholder}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={tierId}
              onChange={(e) => setTierId(e.target.value)}
              className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            >
              <option value="">{dict.settings.tiers.noTierOption}</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={groupLabel}
              onChange={(e) => setGroupLabel(e.target.value)}
              placeholder={dict.guests.addHousehold.groupPlaceholder}
              list={`group-labels-${household.id}`}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
            />
            <datalist id={`group-labels-${household.id}`}>
              {existingGroups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? dict.common.saving : dict.common.save}
          </button>
        </form>
      )}
    </div>
  )
}
