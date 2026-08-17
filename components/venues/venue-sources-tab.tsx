'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

export interface VenueSource {
  id: string
  url: string
  platform: string | null
  title: string | null
  image_url: string | null
  description: string | null
  price_shown: string | null
}

export function VenueSourcesTab({
  dict,
  venueId,
  sources,
}: {
  dict: Dictionary
  venueId: string
  sources: VenueSource[]
}) {
  const router = useRouter()
  const d = dict.venues.sources
  const supabase = createClient()

  const [url, setUrl] = useState('')
  const [priceShown, setPriceShown] = useState('')
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setSaving(true)
    setFetching(true)
    setError(null)

    let og: { title?: string | null; image?: string | null; description?: string | null; platform?: string | null } = {}
    try {
      const res = await fetch(`/api/venues/og?url=${encodeURIComponent(url.trim())}`)
      const data = await res.json()
      if (data.ok) og = data
    } catch {
      // fall through — source is still added, just without OG metadata
    }
    setFetching(false)

    const { error } = await supabase.from('venue_sources').insert({
      venue_id: venueId,
      url: url.trim(),
      platform: og.platform ?? new URL(url.trim()).hostname.replace(/^www\./, ''),
      title: og.title ?? null,
      image_url: og.image ?? null,
      description: og.description ?? null,
      price_shown: priceShown || null,
      last_checked_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setUrl('')
      setPriceShown('')
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('venue_sources').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {sources.map((s) => (
          <li key={s.id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
            {s.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.image_url} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{s.title || s.url}</p>
              {s.platform && <p className="text-xs text-muted-foreground">{s.platform}</p>}
              {s.price_shown && <p className="text-xs text-muted-foreground">{s.price_shown}</p>}
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {d.openOriginal}
              </a>
            </div>
            <button
              onClick={() => handleDelete(s.id)}
              className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
            >
              {dict.common.delete}
            </button>
          </li>
        ))}
        {sources.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>

      <form onSubmit={handleAdd} className="space-y-2 rounded-xl border bg-muted/30 p-4">
        <div className="flex gap-2">
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={d.urlPlaceholder}
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
          />
          <input
            type="text"
            value={priceShown}
            onChange={(e) => setPriceShown(e.target.value)}
            placeholder={d.pricePlaceholder}
            className="w-40 shrink-0 rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
          />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
        >
          {fetching ? d.fetching : saving ? dict.common.saving : d.addSource}
        </button>
      </form>
    </div>
  )
}
