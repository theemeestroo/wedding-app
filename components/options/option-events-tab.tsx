'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { EventType } from '@/lib/cost-engine'
import type { Dictionary } from '@/lib/i18n'
import { EVENT_TYPES, type EventRow } from './shared'

export function OptionEventsTab({
  dict,
  optionId,
  events,
}: {
  dict: Dictionary
  optionId: string
  events: EventRow[]
}) {
  const router = useRouter()
  const d = dict.options.detail
  const supabase = createClient()

  const usedEventTypes = new Set(events.map((e) => e.event_type))
  const [newEventType, setNewEventType] = useState<EventType>(
    EVENT_TYPES.find((t) => !usedEventTypes.has(t)) ?? 'other',
  )

  async function handleAddEvent(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('option_events').insert({ option_id: optionId, event_type: newEventType, attendance_mode: 'full_plan' })
    router.refresh()
  }

  async function handleUpdateEvent(eventId: string, patch: Partial<EventRow>) {
    await supabase.from('option_events').update(patch).eq('id', eventId)
    router.refresh()
  }

  async function handleDeleteEvent(eventId: string) {
    await supabase.from('option_events').delete().eq('id', eventId)
    router.refresh()
  }

  return (
    <section className="space-y-4">
      <ul className="space-y-2">
        {events.map((ev) => (
          <li key={ev.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {d.eventTypeLabels[ev.event_type]}
                {ev.is_primary && <span className="ml-2 text-xs text-muted-foreground">({d.primaryBadge})</span>}
              </span>
              {!ev.is_primary && (
                <button onClick={() => handleDeleteEvent(ev.id)} className="text-xs text-muted-foreground hover:text-destructive">
                  {dict.common.delete}
                </button>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <input
                type="date"
                defaultValue={ev.event_date ?? ''}
                onBlur={(e) => handleUpdateEvent(ev.id, { event_date: e.target.value || null })}
                className="rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <select
                defaultValue={ev.attendance_mode}
                onChange={(e) => handleUpdateEvent(ev.id, { attendance_mode: e.target.value as EventRow['attendance_mode'] })}
                className="rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                <option value="full_plan">{d.attendanceFullPlan}</option>
                <option value="percentage">{d.attendancePercentage}</option>
                <option value="fixed_count">{d.attendanceFixedCount}</option>
              </select>
              {ev.attendance_mode === 'percentage' && (
                <input
                  type="number"
                  min={0}
                  max={100}
                  defaultValue={ev.attendance_percentage ?? ''}
                  onBlur={(e) => handleUpdateEvent(ev.id, { attendance_percentage: e.target.value ? Number(e.target.value) : null })}
                  placeholder="%"
                  className="w-16 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              )}
              {ev.attendance_mode === 'fixed_count' && (
                <>
                  <input
                    type="number"
                    min={0}
                    defaultValue={ev.attendance_adults ?? ''}
                    onBlur={(e) => handleUpdateEvent(ev.id, { attendance_adults: e.target.value ? Number(e.target.value) : null })}
                    placeholder={d.adultsPlaceholder}
                    className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                  <input
                    type="number"
                    min={0}
                    defaultValue={ev.attendance_children ?? ''}
                    onBlur={(e) => handleUpdateEvent(ev.id, { attendance_children: e.target.value ? Number(e.target.value) : null })}
                    placeholder={d.childrenPlaceholder}
                    className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  />
                </>
              )}
              <input
                type="number"
                min={0}
                defaultValue={ev.nights ?? ''}
                onBlur={(e) => handleUpdateEvent(ev.id, { nights: e.target.value ? Number(e.target.value) : null })}
                placeholder={d.nightsPlaceholder}
                className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <input
                type="number"
                min={0}
                defaultValue={ev.rooms ?? ''}
                onBlur={(e) => handleUpdateEvent(ev.id, { rooms: e.target.value ? Number(e.target.value) : null })}
                placeholder={d.roomsPlaceholder}
                className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              <input
                type="number"
                min={0}
                defaultValue={ev.hours ?? ''}
                onBlur={(e) => handleUpdateEvent(ev.id, { hours: e.target.value ? Number(e.target.value) : null })}
                placeholder={d.hoursPlaceholder}
                className="w-20 rounded-lg border bg-background px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              />
            </div>
          </li>
        ))}
      </ul>

      {usedEventTypes.size < EVENT_TYPES.length && (
        <form onSubmit={handleAddEvent} className="flex items-center gap-2">
          <select
            value={newEventType}
            onChange={(e) => setNewEventType(e.target.value as EventType)}
            className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {EVENT_TYPES.filter((t) => !usedEventTypes.has(t)).map((t) => (
              <option key={t} value={t}>{d.eventTypeLabels[t]}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg border bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted">
            {d.addEvent}
          </button>
        </form>
      )}
    </section>
  )
}
