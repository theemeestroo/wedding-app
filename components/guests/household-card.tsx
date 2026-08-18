'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

const TIERS = ['A', 'B', 'C', 'D'] as const

// Graduated visual weight by tier — A reads heaviest (closest circle), D
// lightest — so the list telegraphs priority at a glance, not just on hover.
const TIER_STYLES: Record<(typeof TIERS)[number], string> = {
  A: 'border-primary bg-primary text-primary-foreground',
  B: 'border-primary/50 bg-primary/15 text-primary',
  C: 'border-primary/30 bg-primary/5 text-primary/80',
  D: 'border-border bg-muted text-muted-foreground',
}

export interface HouseholdGuest {
  id: string
  first_name: string
  last_name: string | null
  is_child: boolean
}

export interface Household {
  id: string
  name: string
  home_city: string | null
  home_country: string | null
  tier: (typeof TIERS)[number]
  group_label: string | null
  origin_cluster_id: string | null
}

export interface ClusterOption {
  id: string
  label: string
}

export function HouseholdCard({
  dict,
  household,
  guests,
  clusters,
}: {
  dict: Dictionary
  household: Household
  guests: HouseholdGuest[]
  clusters: ClusterOption[]
}) {
  const router = useRouter()
  const d = dict.guests.household
  const supabase = createClient()

  const [editing, setEditing] = useState(false)
  const [city, setCity] = useState(household.home_city ?? '')
  const [country, setCountry] = useState(household.home_country ?? '')
  const [tier, setTier] = useState(household.tier)
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
        home_city: city || null,
        home_country: country || null,
        tier,
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

  async function handleDeleteHousehold() {
    if (!confirm(d.confirmDelete)) return
    await supabase.from('households').delete().eq('id', household.id)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3.5">
          <span
            title={`${dict.guests.tierLabel} ${household.tier}`}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-heading text-sm italic ${TIER_STYLES[household.tier]}`}
          >
            {household.tier}
          </span>
          <div>
            <h3 className="font-heading text-lg italic tracking-tight">{household.name}</h3>
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
          <li key={g.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              {g.first_name} {g.last_name}
              {g.is_child && (
                <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {d.childBadge}
                </span>
              )}
            </span>
            <button onClick={() => handleDeleteGuest(g.id)} className="text-xs text-muted-foreground hover:text-destructive">
              {dict.common.delete}
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAddGuest} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={newGuestFirst}
          onChange={(e) => setNewGuestFirst(e.target.value)}
          placeholder={d.firstNamePlaceholder}
          className="w-32 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <input
          type="text"
          value={newGuestLast}
          onChange={(e) => setNewGuestLast(e.target.value)}
          placeholder={d.lastNamePlaceholder}
          className="w-32 rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
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
          className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
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
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={dict.guests.addHousehold.cityPlaceholder}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder={dict.guests.addHousehold.countryPlaceholder}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])}
              className="rounded-lg border bg-background px-2 py-1.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {dict.guests.tierLabel} {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={groupLabel}
              onChange={(e) => setGroupLabel(e.target.value)}
              placeholder={dict.guests.addHousehold.groupPlaceholder}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
            />
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
