'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import type { TierOption } from '@/components/guests/household-card'

export function PlanForm({
  dict,
  projectId,
  tiers: tierOptions,
}: {
  dict: Dictionary
  projectId: string
  tiers: TierOption[]
}) {
  const router = useRouter()
  const d = dict.plans.form
  const supabase = createClient()

  const [name, setName] = useState('')
  const [tierIds, setTierIds] = useState<Set<string>>(() => new Set(tierOptions.slice(0, 2).map((t) => t.id)))
  const [groups, setGroups] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleTier(id: string) {
    setTierIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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
      included_tier_ids: Array.from(tierIds),
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
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
      />
      <div className="flex flex-wrap gap-3">
        {tierOptions.map((t) => (
          <label key={t.id} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={tierIds.has(t.id)} onChange={() => toggleTier(t.id)} />
            {t.label}
          </label>
        ))}
      </div>
      <input
        type="text"
        value={groups}
        onChange={(e) => setGroups(e.target.value)}
        placeholder={d.groupsPlaceholder}
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground border border-transparent transition-colors duration-300 hover:border-gold disabled:opacity-50"
      >
        {saving ? dict.common.saving : d.submit}
      </button>
    </form>
  )
}
