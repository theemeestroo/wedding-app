'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import type { TierOption } from '@/components/guests/household-card'

export function AddHouseholdForm({
  dict,
  projectId,
  tiers,
  existingGroups,
}: {
  dict: Dictionary
  projectId: string
  tiers: TierOption[]
  existingGroups: string[]
}) {
  const router = useRouter()
  const d = dict.guests.addHousehold
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [isChild, setIsChild] = useState(false)
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [tierId, setTierId] = useState(tiers[0]?.id ?? '')
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
        tier_id: tierId || null,
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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-card p-6 sm:p-7">
      <h2 className="mb-1 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
        <span className="h-px w-5 bg-primary/40" aria-hidden="true" />
        {d.heading}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          required
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder={d.firstNamePlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
        />
        <input
          type="text"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder={d.lastNamePlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
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
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
        />
        <input
          type="text"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          placeholder={d.countryPlaceholder}
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select
          value={tierId}
          onChange={(e) => setTierId(e.target.value)}
          className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
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
          placeholder={d.groupPlaceholder}
          list="group-labels-new"
          className="rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
        />
        <datalist id="group-labels-new">
          {existingGroups.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent transition-colors duration-300 hover:border-gold disabled:opacity-50"
      >
        {saving ? dict.common.saving : d.submit}
      </button>
    </form>
  )
}
