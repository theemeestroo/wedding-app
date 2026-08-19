'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'
import type { VenueDocumentOption } from './enquiry-timeline'

export interface Quote {
  id: string
  amount: number | null
  currency: string | null
  valid_until: string | null
  notes: string | null
  document_id: string | null
}

export function EnquiryQuotes({
  dict,
  enquiryId,
  quotes,
  documents,
}: {
  dict: Dictionary
  enquiryId: string
  quotes: Quote[]
  documents: VenueDocumentOption[]
}) {
  const router = useRouter()
  const d = dict.enquiries.quotes
  const supabase = createClient()

  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [documentId, setDocumentId] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    await supabase.from('quotes').insert({
      enquiry_id: enquiryId,
      amount: amount ? Number(amount) : null,
      currency,
      valid_until: validUntil || null,
      notes: notes || null,
      document_id: documentId || null,
    })

    setSaving(false)
    setAmount('')
    setValidUntil('')
    setNotes('')
    setDocumentId('')
    router.refresh()
  }

  const documentById = new Map(documents.map((doc) => [doc.id, doc.filename]))

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.heading}</h2>

      <ul className="space-y-2">
        {quotes.map((q) => (
          <li key={q.id} className="rounded-xl border bg-card px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {q.amount != null ? `${q.amount} ${q.currency ?? ''}` : d.noAmount}
              </span>
              {q.valid_until && (
                <span className="text-xs text-muted-foreground">
                  {interpolate(d.validUntilOn, { date: q.valid_until })}
                </span>
              )}
            </div>
            {q.notes && <p className="mt-1 text-sm text-muted-foreground">{q.notes}</p>}
            {q.document_id && documentById.get(q.document_id) && (
              <p className="mt-1 text-xs text-muted-foreground">{documentById.get(q.document_id)}</p>
            )}
          </li>
        ))}
        {quotes.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>

      <form onSubmit={handleAdd} className="space-y-2 rounded-xl border bg-muted/30 p-4">
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={d.amountPlaceholder}
            className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          />
          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            maxLength={3}
            className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          />
          <input
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
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
          {saving ? dict.common.saving : d.addQuote}
        </button>
      </form>
    </div>
  )
}
