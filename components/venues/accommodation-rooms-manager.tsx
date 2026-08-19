'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

export interface AccommodationRoom {
  id: string
  accommodation_id: string
  label: string
  room_type: string | null
  capacity_adults: number
  capacity_children: number
  nightly_rate: number
  currency: string | null
}

export function AccommodationRoomsManager({
  dict,
  accommodationId,
  rooms,
}: {
  dict: Dictionary
  accommodationId: string
  rooms: AccommodationRoom[]
}) {
  const router = useRouter()
  const d = dict.venues.accommodation.rooms
  const supabase = createClient()

  const [label, setLabel] = useState('')
  const [roomType, setRoomType] = useState('')
  const [capacityAdults, setCapacityAdults] = useState('2')
  const [capacityChildren, setCapacityChildren] = useState('0')
  const [nightlyRate, setNightlyRate] = useState('')
  const [currency, setCurrency] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAddRooms(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !nightlyRate) return
    setSaving(true)
    setError(null)

    const count = Math.max(1, Number(quantity) || 1)
    const newRooms = Array.from({ length: count }, (_, i) => ({
      accommodation_id: accommodationId,
      label: count > 1 ? `${label} ${i + 1}` : label,
      room_type: roomType || null,
      capacity_adults: Number(capacityAdults) || 0,
      capacity_children: Number(capacityChildren) || 0,
      nightly_rate: Number(nightlyRate),
      currency: currency || null,
    }))

    const { error } = await supabase.from('accommodation_rooms').insert(newRooms)

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setLabel('')
      setRoomType('')
      setNightlyRate('')
      setQuantity('1')
      router.refresh()
    }
  }

  async function handleUpdateRoom(id: string, patch: Partial<AccommodationRoom>) {
    await supabase.from('accommodation_rooms').update(patch).eq('id', id)
    router.refresh()
  }

  async function handleDeleteRoom(id: string) {
    await supabase.from('accommodation_rooms').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{d.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">{d.labelPlaceholder}</th>
                <th scope="col" className="px-3 py-2 font-medium">{d.roomTypePlaceholder}</th>
                <th scope="col" className="px-3 py-2 font-medium">{d.capacityAdultsPlaceholder}</th>
                <th scope="col" className="px-3 py-2 font-medium">{d.capacityChildrenPlaceholder}</th>
                <th scope="col" className="px-3 py-2 font-medium">{d.nightlyRatePlaceholder}</th>
                <th scope="col" className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id} className="border-b last:border-0">
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      defaultValue={room.label}
                      onBlur={(e) => e.target.value && handleUpdateRoom(room.id, { label: e.target.value })}
                      className="w-28 rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="text"
                      defaultValue={room.room_type ?? ''}
                      onBlur={(e) => handleUpdateRoom(room.id, { room_type: e.target.value || null })}
                      className="w-24 rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      defaultValue={room.capacity_adults}
                      onBlur={(e) => handleUpdateRoom(room.id, { capacity_adults: Number(e.target.value) || 0 })}
                      className="w-16 rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <input
                      type="number"
                      min={0}
                      defaultValue={room.capacity_children}
                      onBlur={(e) => handleUpdateRoom(room.id, { capacity_children: Number(e.target.value) || 0 })}
                      className="w-16 rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                    />
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        defaultValue={room.nightly_rate}
                        onBlur={(e) => handleUpdateRoom(room.id, { nightly_rate: Number(e.target.value) || 0 })}
                        className="w-20 rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                      />
                      <span className="text-xs text-muted-foreground">{room.currency}</span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button onClick={() => handleDeleteRoom(room.id)} className="text-xs text-muted-foreground hover:text-destructive">
                      {dict.common.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={handleAddRooms} className="space-y-2 rounded-lg border bg-background p-3">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={d.labelPlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
          />
          <input
            type="text"
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            placeholder={d.roomTypePlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
          />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <input
            type="number"
            min="0"
            value={capacityAdults}
            onChange={(e) => setCapacityAdults(e.target.value)}
            placeholder={d.capacityAdultsPlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
          />
          <input
            type="number"
            min="0"
            value={capacityChildren}
            onChange={(e) => setCapacityChildren(e.target.value)}
            placeholder={d.capacityChildrenPlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={nightlyRate}
            onChange={(e) => setNightlyRate(e.target.value)}
            placeholder={d.nightlyRatePlaceholder}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
          />
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            placeholder={d.currencyPlaceholder}
            maxLength={3}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
          />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="room-quantity" className="text-xs text-muted-foreground">{d.quantityLabel}</label>
          <input
            id="room-quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-20 rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
          />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? dict.common.saving : d.addRooms}
        </button>
      </form>
    </div>
  )
}
