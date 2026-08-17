'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { localizePath } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'

interface Option {
  id: string
  name: string
}

export function CreateOptionForm({
  lang,
  dict,
  projectId,
  plans,
  venues,
}: {
  lang: string
  dict: Dictionary
  projectId: string
  plans: Option[]
  venues: Option[]
}) {
  const router = useRouter()
  const d = dict.options.create
  const supabase = createClient()

  const [guestPlanId, setGuestPlanId] = useState(plans[0]?.id ?? '')
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { data, error } = await supabase
      .from('options')
      .insert({ project_id: projectId, guest_plan_id: guestPlanId, venue_id: venueId, name: name || null })
      .select('id')
      .single()

    setSaving(false)

    if (error || !data) {
      setError(error?.message ?? d.genericError)
      return
    }

    router.push(localizePath(lang, `/options/${data.id}`))
    router.refresh()
  }

  if (plans.length === 0 || venues.length === 0) {
    return <p className="text-sm text-muted-foreground">{d.needsPlanAndVenue}</p>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="opt-plan" className="text-sm font-medium">{d.planLabel}</label>
        <select
          id="opt-plan"
          value={guestPlanId}
          onChange={(e) => setGuestPlanId(e.target.value)}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="opt-venue" className="text-sm font-medium">{d.venueLabel}</label>
        <select
          id="opt-venue"
          value={venueId}
          onChange={(e) => setVenueId(e.target.value)}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          {venues.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="opt-name" className="text-sm font-medium">{d.nameLabel}</label>
        <input
          id="opt-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={d.namePlaceholder}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {saving ? dict.common.saving : d.submit}
      </button>
    </form>
  )
}
