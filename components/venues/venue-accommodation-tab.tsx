'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'
import { ConfidenceBadge } from '@/components/shared/confidence-badge'
import { AccommodationRoomsManager, type AccommodationRoom } from './accommodation-rooms-manager'

type Confidence = 'guess' | 'researched' | 'confirmed' | 'contracted'
export type AccommodationType = 'venue_block' | 'hotel' | 'villa' | 'other'

export interface Accommodation {
  id: string
  name: string
  type: AccommodationType
  confidence: Confidence
}

const TYPES: AccommodationType[] = ['venue_block', 'hotel', 'villa', 'other']
const CONFIDENCES: Confidence[] = ['guess', 'researched', 'confirmed', 'contracted']

export function VenueAccommodationTab({
  dict,
  venueId,
  accommodations,
  rooms,
}: {
  dict: Dictionary
  venueId: string
  accommodations: Accommodation[]
  rooms: AccommodationRoom[]
}) {
  const router = useRouter()
  const d = dict.venues.accommodation
  const supabase = createClient()

  const [name, setName] = useState('')
  const [type, setType] = useState<AccommodationType>('hotel')
  const [confidence, setConfidence] = useState<Confidence>('guess')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('accommodations').insert({
      venue_id: venueId,
      name,
      type,
      confidence,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setName('')
      setConfidence('guess')
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('accommodations').delete().eq('id', id)
    if (expandedId === id) setExpandedId(null)
    router.refresh()
  }

  const roomsByAccommodation = new Map<string, AccommodationRoom[]>()
  for (const room of rooms) {
    const list = roomsByAccommodation.get(room.accommodation_id) ?? []
    list.push(room)
    roomsByAccommodation.set(room.accommodation_id, list)
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {accommodations.map((a) => {
          const accommodationRooms = roomsByAccommodation.get(a.id) ?? []
          const isExpanded = expandedId === a.id
          return (
            <li key={a.id} className="rounded-xl border bg-card">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{a.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {d.typeLabels[a.type]}
                    {' · '}
                    {interpolate(d.rooms.roomCount, { count: accommodationRooms.length })}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ConfidenceBadge confidence={a.confidence} label={d.confidenceLabels[a.confidence]} />
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : a.id)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {isExpanded ? d.hideRooms : d.manageRooms}
                  </button>
                  <button onClick={() => handleDelete(a.id)} className="text-xs text-muted-foreground hover:text-destructive">
                    {dict.common.delete}
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div className="border-t bg-muted/20 p-4">
                  <AccommodationRoomsManager dict={dict} accommodationId={a.id} rooms={accommodationRooms} />
                </div>
              )}
            </li>
          )
        })}
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
        <select
          value={confidence}
          onChange={(e) => setConfidence(e.target.value as Confidence)}
          className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          {CONFIDENCES.map((c) => (
            <option key={c} value={c}>{d.confidenceLabels[c]}</option>
          ))}
        </select>
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
