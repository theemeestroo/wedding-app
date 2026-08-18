'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import { ConfidenceBadge } from '@/components/shared/confidence-badge'

type Confidence = 'guess' | 'researched' | 'confirmed' | 'contracted'
export type AccommodationType = 'venue_block' | 'hotel' | 'villa' | 'other'

export interface Accommodation {
  id: string
  name: string
  type: AccommodationType
  rooms_available: number | null
  capacity_adults: number | null
  capacity_children: number | null
  nightly_rate: number | null
  currency: string | null
  confidence: Confidence
}

const TYPES: AccommodationType[] = ['venue_block', 'hotel', 'villa', 'other']
const CONFIDENCES: Confidence[] = ['guess', 'researched', 'confirmed', 'contracted']

export function VenueAccommodationTab({
  dict,
  venueId,
  accommodations,
}: {
  dict: Dictionary
  venueId: string
  accommodations: Accommodation[]
}) {
  const router = useRouter()
  const d = dict.venues.accommodation
  const supabase = createClient()

  const [name, setName] = useState('')
  const [type, setType] = useState<AccommodationType>('hotel')
  const [roomsAvailable, setRoomsAvailable] = useState('')
  const [capacityAdults, setCapacityAdults] = useState('')
  const [capacityChildren, setCapacityChildren] = useState('')
  const [nightlyRate, setNightlyRate] = useState('')
  const [currency, setCurrency] = useState('')
  const [confidence, setConfidence] = useState<Confidence>('guess')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('accommodations').insert({
      venue_id: venueId,
      name,
      type,
      rooms_available: roomsAvailable ? Number(roomsAvailable) : null,
      capacity_adults: capacityAdults ? Number(capacityAdults) : null,
      capacity_children: capacityChildren ? Number(capacityChildren) : null,
      nightly_rate: nightlyRate ? Number(nightlyRate) : null,
      currency: currency || null,
      confidence,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setName('')
      setRoomsAvailable('')
      setCapacityAdults('')
      setCapacityChildren('')
      setNightlyRate('')
      setCurrency('')
      setConfidence('guess')
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('accommodations').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {accommodations.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{a.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {d.typeLabels[a.type]}
                {a.rooms_available != null && ` · ${a.rooms_available} ${d.roomsUnit}`}
                {(a.capacity_adults != null || a.capacity_children != null) &&
                  ` · ${d.capacityLabel} ${a.capacity_adults ?? 0}+${a.capacity_children ?? 0}`}
                {a.nightly_rate != null && ` · ${a.nightly_rate} ${a.currency ?? ''} ${d.perNight}`}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ConfidenceBadge confidence={a.confidence} label={d.confidenceLabels[a.confidence]} />
              <button onClick={() => handleDelete(a.id)} className="text-xs text-muted-foreground hover:text-destructive">
                {dict.common.delete}
              </button>
            </div>
          </li>
        ))}
        {accommodations.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>

      <form onSubmit={handleAdd} className="space-y-2 rounded-xl border bg-muted/30 p-4">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={d.namePlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AccommodationType)}
            className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{d.typeLabels[t]}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min="0"
            value={roomsAvailable}
            onChange={(e) => setRoomsAvailable(e.target.value)}
            placeholder={d.roomsPlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <input
            type="number"
            min="0"
            value={capacityAdults}
            onChange={(e) => setCapacityAdults(e.target.value)}
            placeholder={d.capacityAdultsPlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <input
            type="number"
            min="0"
            value={capacityChildren}
            onChange={(e) => setCapacityChildren(e.target.value)}
            placeholder={d.capacityChildrenPlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            min="0"
            step="0.01"
            value={nightlyRate}
            onChange={(e) => setNightlyRate(e.target.value)}
            placeholder={d.nightlyRatePlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder={d.currencyPlaceholder}
            maxLength={3}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as Confidence)}
            className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {CONFIDENCES.map((c) => (
              <option key={c} value={c}>{d.confidenceLabels[c]}</option>
            ))}
          </select>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
        >
          {saving ? dict.common.saving : d.addAccommodation}
        </button>
      </form>
    </div>
  )
}
