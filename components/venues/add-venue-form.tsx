'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { localizePath } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'

type Archetype = 'bare_villa' | 'all_inclusive' | 'hotel'

export function AddVenueForm({
  lang,
  dict,
  projectId,
}: {
  lang: string
  dict: Dictionary
  projectId: string
}) {
  const router = useRouter()
  const d = dict.venues.add
  const supabase = createClient()

  const [url, setUrl] = useState('')
  const [fetchingOg, setFetchingOg] = useState(false)
  const [ogResult, setOgResult] = useState<{ title: string | null; image: string | null; description: string | null; platform: string | null } | null>(null)
  const [ogFailed, setOgFailed] = useState(false)

  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [archetype, setArchetype] = useState<Archetype | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleFetchDetails() {
    if (!url.trim()) return
    setFetchingOg(true)
    setOgFailed(false)
    setOgResult(null)

    try {
      const res = await fetch(`/api/venues/og?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      if (data.ok) {
        setOgResult(data)
        if (data.title) setName(data.title)
      } else {
        setOgFailed(true)
      }
    } catch {
      setOgFailed(true)
    } finally {
      setFetchingOg(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        project_id: projectId,
        name,
        location_city: city || null,
        location_country: country || null,
        archetype: archetype || null,
      })
      .select('id')
      .single()

    if (venueError || !venue) {
      setError(venueError?.message ?? d.genericError)
      setSaving(false)
      return
    }

    if (url.trim()) {
      await supabase.from('venue_sources').insert({
        venue_id: venue.id,
        url: url.trim(),
        platform: ogResult?.platform ?? null,
        title: ogResult?.title ?? null,
        image_url: ogResult?.image ?? null,
        description: ogResult?.description ?? null,
        last_checked_at: new Date().toISOString(),
      })
    }

    router.push(localizePath(lang, `/venues/${venue.id}`))
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2 rounded-xl border bg-muted/30 p-4">
        <label htmlFor="venue-url" className="text-sm font-medium">
          {d.urlLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="venue-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={d.urlPlaceholder}
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
          />
          <button
            type="button"
            onClick={handleFetchDetails}
            disabled={!url.trim() || fetchingOg}
            className="shrink-0 rounded-xl border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
          >
            {fetchingOg ? d.fetching : d.fetchDetails}
          </button>
        </div>
        {ogFailed && <p className="text-xs text-muted-foreground">{d.ogFailed}</p>}
        {ogResult?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ogResult.image} alt="" className="h-24 w-full rounded-lg object-cover" />
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="venue-name" className="text-sm font-medium">
          {d.nameLabel}
        </label>
        <input
          id="venue-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={d.namePlaceholder}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="venue-city" className="text-sm font-medium">
            {d.cityLabel}
          </label>
          <input
            id="venue-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="venue-country" className="text-sm font-medium">
            {d.countryLabel}
          </label>
          <input
            id="venue-country"
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="venue-archetype" className="text-sm font-medium">
          {d.archetypeLabel}
        </label>
        <select
          id="venue-archetype"
          value={archetype}
          onChange={(e) => setArchetype(e.target.value as typeof archetype)}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          <option value="">{d.archetypeNone}</option>
          <option value="bare_villa">{d.archetypeBareVilla}</option>
          <option value="all_inclusive">{d.archetypeAllInclusive}</option>
          <option value="hotel">{d.archetypeHotel}</option>
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {saving ? d.saving : d.submit}
      </button>
    </form>
  )
}
