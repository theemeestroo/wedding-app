'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import { ConfidenceBadge } from '@/components/shared/confidence-badge'

type Confidence = 'guess' | 'researched' | 'confirmed' | 'contracted'

export interface VenueFact {
  id: string
  fact_key: string
  fact_value: string
  confidence: Confidence
}

export function VenueFactsTab({
  dict,
  venueId,
  facts,
}: {
  dict: Dictionary
  venueId: string
  facts: VenueFact[]
}) {
  const router = useRouter()
  const d = dict.venues.facts
  const supabase = createClient()

  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const [confidence, setConfidence] = useState<Confidence>('guess')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('venue_facts').insert({
      venue_id: venueId,
      fact_key: key,
      fact_value: value,
      confidence,
    })

    setSaving(false)
    if (error) {
      setError(error.message)
    } else {
      setKey('')
      setValue('')
      setConfidence('guess')
      router.refresh()
    }
  }

  async function handleDelete(id: string) {
    await supabase.from('venue_facts').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {facts.map((f) => (
          <li key={f.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">{f.fact_key}</p>
              <p className="truncate text-sm text-muted-foreground">{f.fact_value}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ConfidenceBadge confidence={f.confidence} label={d.confidenceLabels[f.confidence]} />
              <button onClick={() => handleDelete(f.id)} className="text-xs text-muted-foreground hover:text-destructive">
                {dict.common.delete}
              </button>
            </div>
          </li>
        ))}
        {facts.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>

      <form onSubmit={handleAdd} className="space-y-2 rounded-xl border bg-muted/30 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={d.keyPlaceholder}
            className="w-40 shrink-0 rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          />
          <input
            type="text"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={d.valuePlaceholder}
            className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          />
          <select
            value={confidence}
            onChange={(e) => setConfidence(e.target.value as Confidence)}
            className="shrink-0 rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
          >
            <option value="guess">{d.confidenceLabels.guess}</option>
            <option value="researched">{d.confidenceLabels.researched}</option>
            <option value="confirmed">{d.confidenceLabels.confirmed}</option>
            <option value="contracted">{d.confidenceLabels.contracted}</option>
          </select>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent transition-colors duration-300 hover:border-gold disabled:opacity-50"
        >
          {saving ? dict.common.saving : d.addFact}
        </button>
      </form>
    </div>
  )
}
