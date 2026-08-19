'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/locale'
import {
  computeAccommodationCost,
  computeTransferEstimate,
  computeRoomOccupancy,
  type ArrivalWindow,
  type AllocationInput,
  type ArrivalProfileInput,
  type RoomInput,
} from '@/lib/accommodation-engine'
import type { HouseholdClusterInput } from '@/lib/journey-engine'
import type { Dictionary } from '@/lib/i18n'
import {
  ARRIVAL_WINDOWS,
  fmt,
  type AccommodationRow,
  type RoomRow,
  type ArrivalProfileRow,
  type AllocationRow,
  type HouseholdRow,
} from './shared'

export function OptionAccommodationTab({
  dict,
  optionId,
  currency,
  households,
  accommodations,
  rooms,
  arrivalProfiles,
  allocations,
  householdClusters,
}: {
  dict: Dictionary
  optionId: string
  currency: string
  households: HouseholdRow[]
  accommodations: AccommodationRow[]
  rooms: RoomRow[]
  arrivalProfiles: ArrivalProfileRow[]
  allocations: AllocationRow[]
  householdClusters: HouseholdClusterInput[]
}) {
  const router = useRouter()
  const d = dict.options.detail
  const supabase = createClient()

  const arrivalProfileByHousehold = new Map(arrivalProfiles.map((p) => [p.household_id, p]))
  const accommodationById = new Map(accommodations.map((a) => [a.id, a]))
  const roomById = new Map(rooms.map((r) => [r.id, r]))
  const allocationsByHousehold = new Map<string, AllocationRow[]>()
  for (const a of allocations) {
    const list = allocationsByHousehold.get(a.household_id) ?? []
    list.push(a)
    allocationsByHousehold.set(a.household_id, list)
  }
  const bookedRoomIds = new Set(allocations.map((a) => a.room_id))
  const availableRooms = rooms.filter((r) => !bookedRoomIds.has(r.id))

  const occupancy = computeRoomOccupancy(
    rooms.map((r) => ({ id: r.id, accommodationId: r.accommodation_id })),
    allocations.map((a) => ({ roomId: a.room_id })),
  )

  const [estimating, setEstimating] = useState(false)
  const [estimateResult, setEstimateResult] = useState<{
    accommodationTotal: number
    transferTotal: number
    defaultedNightsCount: number
    unscheduledGuestCount: number
  } | null>(null)

  async function handleUpdateArrivalProfile(
    householdId: string,
    patch: Partial<Pick<ArrivalProfileRow, 'arrival_date' | 'arrival_window' | 'departure_date' | 'departure_window' | 'visa_notes'>>,
  ) {
    await supabase
      .from('arrival_profiles')
      .upsert({ option_id: optionId, household_id: householdId, ...patch }, { onConflict: 'option_id,household_id' })
    router.refresh()
  }

  async function handleAssignRoom(householdId: string, roomId: string) {
    if (!roomId) return
    await supabase.from('allocations').insert({ option_id: optionId, household_id: householdId, room_id: roomId })
    router.refresh()
  }

  async function handleUnassignRoom(allocationId: string) {
    await supabase.from('allocations').delete().eq('id', allocationId)
    router.refresh()
  }

  async function handleEstimateCosts() {
    setEstimating(true)

    const allocationInputs: AllocationInput[] = allocations.map((a) => ({
      householdId: a.household_id,
      roomId: a.room_id,
    }))
    const arrivalProfileInputs: ArrivalProfileInput[] = arrivalProfiles.map((p) => ({
      householdId: p.household_id,
      arrivalDate: p.arrival_date,
      arrivalWindow: p.arrival_window,
      departureDate: p.departure_date,
      departureWindow: p.departure_window,
    }))
    const roomInputs: RoomInput[] = rooms.map((r) => ({
      id: r.id,
      nightlyRate: r.nightly_rate,
      currency: r.currency,
    }))

    const accommodationResult = computeAccommodationCost(allocationInputs, arrivalProfileInputs, roomInputs)
    const transferResult = computeTransferEstimate(householdClusters, arrivalProfileInputs)

    await supabase.from('cost_rules').delete().eq('option_id', optionId).eq('label', d.accommodationCostLabel)
    await supabase.from('cost_rules').delete().eq('option_id', optionId).eq('label', d.transferCostLabel)

    const newRules = []
    if (accommodationResult.total > 0) {
      newRules.push({
        option_id: optionId,
        label: d.accommodationCostLabel,
        basis: 'fixed' as const,
        rate: accommodationResult.total,
        currency: accommodationResult.currency ?? currency,
        confidence: 'guess' as const,
        provenance: { source: 'accommodation_engine' },
      })
    }
    if (transferResult.total > 0) {
      newRules.push({
        option_id: optionId,
        label: d.transferCostLabel,
        basis: 'fixed' as const,
        rate: transferResult.total,
        currency,
        confidence: 'guess' as const,
        provenance: { source: 'accommodation_engine' },
      })
    }
    if (newRules.length > 0) {
      await supabase.from('cost_rules').insert(newRules)
    }

    setEstimateResult({
      accommodationTotal: accommodationResult.total,
      transferTotal: transferResult.total,
      defaultedNightsCount: accommodationResult.defaultedHouseholdCount,
      unscheduledGuestCount: transferResult.unscheduledGuestCount,
    })
    setEstimating(false)
    router.refresh()
  }

  return (
    <section className="space-y-4">
      {rooms.length === 0 ? (
        <p className="text-sm text-muted-foreground">{d.noAccommodations}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {occupancy.map((o) => (
              <span
                key={o.accommodationId}
                className={
                  'rounded-full px-2.5 py-1 text-xs font-medium ' +
                  (o.isFull ? 'bg-amber-50 text-amber-800' : 'bg-muted text-muted-foreground')
                }
              >
                {accommodationById.get(o.accommodationId)?.name ?? ''}
                {': '}
                {interpolate(d.occupancyBadge, { booked: o.bookedRooms, total: o.totalRooms })}
                {o.isFull && ` · ${d.occupancyFull}`}
              </span>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-sm" aria-label={d.accommodationHeading}>
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th scope="col" className="px-4 py-2 font-medium">{d.householdColumn}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{d.arrivalColumn}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{d.departureColumn}</th>
                  <th scope="col" className="min-w-[12rem] px-4 py-2 font-medium">{d.accommodationColumn}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{d.visaNotesColumn}</th>
                </tr>
              </thead>
              <tbody>
                {households.map((h) => {
                  const profile = arrivalProfileByHousehold.get(h.id)
                  const householdAllocations = allocationsByHousehold.get(h.id) ?? []
                  const guestCount = h.adultCount + h.childCount
                  return (
                    <tr key={h.id} className="border-b last:border-0 align-top">
                      <td className="px-4 py-2 font-medium">{h.name}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            defaultValue={profile?.arrival_date ?? ''}
                            onBlur={(e) => handleUpdateArrivalProfile(h.id, { arrival_date: e.target.value || null })}
                            className="rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          />
                          <select
                            defaultValue={profile?.arrival_window ?? ''}
                            onChange={(e) =>
                              handleUpdateArrivalProfile(h.id, { arrival_window: (e.target.value || null) as ArrivalWindow | null })
                            }
                            className="rounded-lg border bg-background px-1.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            <option value="">{d.windowUnset}</option>
                            {ARRIVAL_WINDOWS.map((w) => (
                              <option key={w} value={w}>{d.windowLabels[w]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            defaultValue={profile?.departure_date ?? ''}
                            onBlur={(e) => handleUpdateArrivalProfile(h.id, { departure_date: e.target.value || null })}
                            className="rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          />
                          <select
                            defaultValue={profile?.departure_window ?? ''}
                            onChange={(e) =>
                              handleUpdateArrivalProfile(h.id, { departure_window: (e.target.value || null) as ArrivalWindow | null })
                            }
                            className="rounded-lg border bg-background px-1.5 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                          >
                            <option value="">{d.windowUnset}</option>
                            {ARRIVAL_WINDOWS.map((w) => (
                              <option key={w} value={w}>{d.windowLabels[w]}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="min-w-[12rem] px-4 py-2">
                        <div className="flex flex-col gap-1">
                          {householdAllocations.length === 0 && (
                            <span className="text-xs text-muted-foreground">{d.noAccommodationSelected}</span>
                          )}
                          {householdAllocations.map((a) => {
                            const room = roomById.get(a.room_id)
                            if (!room) return null
                            const roomCapacity = room.capacity_adults + room.capacity_children
                            const overCapacity = guestCount > roomCapacity
                            return (
                              <div
                                key={a.id}
                                className="flex items-center justify-between gap-2 rounded-lg border bg-background px-2 py-1 text-xs"
                              >
                                <div>
                                  <p className="whitespace-nowrap">
                                    {accommodationById.get(room.accommodation_id)?.name} · {room.label}
                                  </p>
                                  {overCapacity && (
                                    <p className="whitespace-nowrap text-amber-700">
                                      {interpolate(d.roomCapacityWarning, { guestCount, capacity: roomCapacity })}
                                    </p>
                                  )}
                                </div>
                                <button onClick={() => handleUnassignRoom(a.id)} className="shrink-0 text-muted-foreground hover:text-destructive">
                                  {dict.common.delete}
                                </button>
                              </div>
                            )
                          })}
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              const roomId = e.target.value
                              e.target.value = ''
                              handleAssignRoom(h.id, roomId)
                            }}
                            disabled={availableRooms.length === 0}
                            className="rounded-lg border bg-background px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-40"
                          >
                            <option value="">{availableRooms.length === 0 ? d.noRoomsAvailable : d.assignRoomPlaceholder}</option>
                            {accommodations.map((acc) => {
                              const accRooms = availableRooms.filter((r) => r.accommodation_id === acc.id)
                              if (accRooms.length === 0) return null
                              return (
                                <optgroup key={acc.id} label={acc.name}>
                                  {accRooms.map((r) => (
                                    <option key={r.id} value={r.id}>{r.label}</option>
                                  ))}
                                </optgroup>
                              )
                            })}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          defaultValue={profile?.visa_notes ?? ''}
                          onBlur={(e) => handleUpdateArrivalProfile(h.id, { visa_notes: e.target.value || null })}
                          placeholder={d.visaNotesPlaceholder}
                          className="w-40 rounded-lg border bg-background px-2 py-1 text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <button
        onClick={handleEstimateCosts}
        disabled={estimating || allocations.length === 0}
        className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
      >
        {estimating ? d.estimating : d.estimateCosts}
      </button>

      {estimateResult && (
        <div className="space-y-1 rounded-xl border bg-muted/30 p-4 text-sm">
          <p className="tabular-nums">
            {d.accommodationCostLabel}: {fmt(estimateResult.accommodationTotal, currency)}
            {' · '}
            {d.transferCostLabel}: {fmt(estimateResult.transferTotal, currency)}
          </p>
          {estimateResult.defaultedNightsCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {interpolate(d.defaultedNightsWarning, { count: estimateResult.defaultedNightsCount })}
            </p>
          )}
          {estimateResult.unscheduledGuestCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {interpolate(d.unscheduledTransferWarning, { count: estimateResult.unscheduledGuestCount })}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
