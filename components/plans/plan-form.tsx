'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

const TIERS = ['A', 'B', 'C', 'D'] as const

export function PlanForm({ dict, projectId }: { dict: Dictionary; projectId: string }) {
  const router = useRouter()
  const d = dict.plans.form
  const supabase = createClient()

  const [name, setName] = useState('')
  const [tiers, setTiers] = useState<Set<string>>(new Set(['A', 'B']))
  const [groups, setGroups] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTier(t: string) {
    setTiers((prev) => {
      const next = new Set(prev)
      if (next.has(t)) next.delete(t)
      else next.add(t)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const { error } = await supabase.from('guest_plans').insert({
      project_id: projectId,
      name,
      included_tiers: Array.from(tiers),
      included_groups: groups
        .split(',')
        .map((g) => g.trim())
        .filter(Boolean),
    })

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setName('')
    setGroups('')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-card p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.heading}</h2>
      <input
        type="text"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={d.namePlaceholder}
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
      />
      <div className="flex flex-wrap gap-3">
        {TIERS.map((t) => (
          <label key={t} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={tiers.has(t)} onChange={() => toggleTier(t)} />
            {dict.guests.tierLabel} {t}
          </label>
        ))}
      </div>
      <input
        type="text"
        value={groups}
        onChange={(e) => setGroups(e.target.value)}
        placeholder={d.groupsPlaceholder}
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
      />
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
