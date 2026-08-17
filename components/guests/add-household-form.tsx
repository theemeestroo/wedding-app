'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

const TIERS = ['A', 'B', 'C', 'D'] as const

export function AddHouseholdForm({
  dict,
  projectId,
}: {
  dict: Dictionary
  projectId: string
}) {
  const router = useRouter()
  const d = dict.guests.addHousehold
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isChild, setIsChild] = useState(false)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [tier, setTier] = useState<(typeof TIERS)[number]>('B')
  const [groupLabel, setGroupLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    let latitude: number | null = null
    let longitude: number | null = null

    if (city.trim() && country.trim()) {
      try {
        const res = await fetch(`/api/geocode?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`)
        const geo = await res.json()
        if (geo.ok) {
          latitude = geo.latitude
          longitude = geo.longitude
        }
      } catch {
        // Geocoding failure isn't fatal — the household still saves, just
        // without coordinates, and won't be included in origin clustering yet.
      }
    }

    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({
        project_id: projectId,
        name: lastName ? `${lastName} household` : firstName,
        home_city: city || null,
        home_country: country || null,
        latitude,
        longitude,
        tier,
        group_label: groupLabel || null,
      })
      .select('id')
      .single()

    if (householdError || !household) {
      setError(householdError?.message ?? d.genericError)
      setSaving(false)
      return
    }

    const { error: guestError } = await supabase.from('guests').insert({
      household_id: household.id,
      first_name: firstName,
      last_name: lastName || null,
      is_child: isChild,
    })

    setSaving(false)

    if (guestError) {
      setError(guestError.message)
      return
    }

    setFirstName('')
    setLastName('')
    setIsChild(false)
    setCity('')
    setCountry('')
    setGroupLabel('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-card p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.heading}</h2>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={d.firstNamePlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={d.lastNamePlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={isChild} onChange={(e) => setIsChild(e.target.checked)} />
        {d.isChildLabel}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder={d.cityPlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={d.countryPlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as (typeof TIERS)[number])}
          className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
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
          placeholder={d.groupPlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {saving ? dict.common.saving : d.submit}
      </button>
    </form>
  )
}
