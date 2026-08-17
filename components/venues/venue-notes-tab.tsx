'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

export function VenueNotesTab({
  dict,
  venueId,
  notes,
}: {
  dict: Dictionary
  venueId: string
  notes: string | null
}) {
  const router = useRouter()
  const d = dict.venues.notes
  const supabase = createClient()
  const [value, setValue] = useState(notes ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await supabase.from('venues').update({ notes: value || null }).eq('id', venueId)
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="max-w-lg space-y-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={d.placeholder}
        rows={10}
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {saving ? dict.common.saving : dict.common.save}
      </button>
    </div>
  )
}
