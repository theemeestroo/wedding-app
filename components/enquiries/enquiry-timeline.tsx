'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

type EventType = 'email' | 'call' | 'whatsapp' | 'viewing' | 'quote' | 'availability_result' | 'note'

const EVENT_TYPES: EventType[] = ['email', 'call', 'whatsapp', 'viewing', 'quote', 'availability_result', 'note']

export interface EnquiryEvent {
  id: string
  event_type: EventType
  occurred_at: string
  notes: string | null
  document_id: string | null
}

export interface VenueDocumentOption {
  id: string
  filename: string
}

export function EnquiryTimeline({
  dict,
  enquiryId,
  events,
  documents,
}: {
  dict: Dictionary
  enquiryId: string
  events: EnquiryEvent[]
  documents: VenueDocumentOption[]
}) {
  const router = useRouter()
  const d = dict.enquiries.timeline
  const supabase = createClient()

  const [eventType, setEventType] = useState<EventType>('email')
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('enquiry_events').insert({
      enquiry_id: enquiryId,
      event_type: eventType,
      occurred_at: new Date(occurredAt).toISOString(),
      notes: notes || null,
      document_id: documentId || null,
    })

    setSaving(false)
    setNotes('')
    setDocumentId('')
    router.refresh()
  }

  const documentById = new Map(documents.map((doc) => [doc.id, doc.filename]))

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.heading}</h2>

      <ul className="space-y-2">
        {events.map((ev) => (
          <li key={ev.id} className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{d.eventTypeLabels[ev.event_type]}</span>
              <span className="text-xs text-muted-foreground">{new Date(ev.occurred_at).toLocaleDateString()}</span>
            </div>
            {ev.notes && <p className="mt-1 text-sm text-muted-foreground">{ev.notes}</p>}
            {ev.document_id && documentById.get(ev.document_id) && (
              <p className="mt-1 text-xs text-muted-foreground">{documentById.get(ev.document_id)}</p>
            )}
          </li>
        ))}
        {events.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>

      <form onSubmit={handleAdd} className="space-y-2 rounded-xl border bg-muted/30 p-4">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventType)}
            className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {d.eventTypeLabels[t]}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          />
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={d.notesPlaceholder}
          rows={2}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
        />
        {documents.length > 0 && (
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          >
            <option value="">{d.noDocument}</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.filename}
              </option>
            ))}
          </select>
        )}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent transition-colors duration-300 hover:border-gold disabled:opacity-50"
        >
          {saving ? dict.common.saving : d.addEvent}
        </button>
      </form>
    </div>
  )
}
