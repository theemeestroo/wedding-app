'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

export interface VenueDetail {
  id: string
  name: string
  location_city: string | null
  location_country: string | null
  archetype: string | null
  status: 'considering' | 'shortlisted' | 'rejected'
  notes: string | null
}

export function VenueOverviewTab({ dict, venue }: { dict: Dictionary; venue: VenueDetail }) {
  const router = useRouter()
  const d = dict.venues.overview
  const supabase = createClient()

  const [name, setName] = useState(venue.name)
  const [city, setCity] = useState(venue.location_city ?? '')
  const [country, setCountry] = useState(venue.location_country ?? '')
  const [archetype, setArchetype] = useState(venue.archetype ?? '')
  const [status, setStatus] = useState(venue.status)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase
      .from('venues')
      .update({
        name,
        location_city: city || null,
        location_country: country || null,
        archetype: archetype || null,
        status,
      })
      .eq('id', venue.id)

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-md space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="ov-name" className="text-sm font-medium">{d.nameLabel}</label>
        <input
          id="ov-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="ov-city" className="text-sm font-medium">{d.cityLabel}</label>
          <input
            id="ov-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ov-country" className="text-sm font-medium">{d.countryLabel}</label>
          <input
            id="ov-country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ov-archetype" className="text-sm font-medium">{d.archetypeLabel}</label>
        <select
          id="ov-archetype"
          value={archetype}
          onChange={(e) => setArchetype(e.target.value)}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          <option value="">{d.archetypeNone}</option>
          <option value="bare_villa">{d.archetypeBareVilla}</option>
          <option value="all_inclusive">{d.archetypeAllInclusive}</option>
          <option value="hotel">{d.archetypeHotel}</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="ov-status" className="text-sm font-medium">{d.statusLabel}</label>
        <select
          id="ov-status"
          value={status}
          onChange={(e) => setStatus(e.target.value as VenueDetail['status'])}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          <option value="considering">{d.statusConsidering}</option>
          <option value="shortlisted">{d.statusShortlisted}</option>
          <option value="rejected">{d.statusRejected}</option>
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {saving ? dict.common.saving : dict.common.save}
      </button>
    </form>
  )
}
