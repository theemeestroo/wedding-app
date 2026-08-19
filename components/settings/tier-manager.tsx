'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'
import type { TierOption } from '@/components/guests/household-card'

export function TierManager({
  dict,
  projectId,
  tiers,
}: {
  dict: Dictionary
  projectId: string
  tiers: TierOption[]
}) {
  const router = useRouter()
  const d = dict.settings.tiers
  const supabase = createClient()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newLabel.trim()) return
    setSaving(true)
    const nextSortOrder = tiers.length > 0 ? Math.max(...tiers.map((t) => t.sortOrder)) + 1 : 0
    await supabase
      .from('tier_definitions')
      .insert({ project_id: projectId, label: newLabel.trim(), sort_order: nextSortOrder })
    setNewLabel('')
    setSaving(false)
    router.refresh()
  }

  async function handleRename(id: string) {
    if (labelDraft.trim()) {
      await supabase.from('tier_definitions').update({ label: labelDraft.trim() }).eq('id', id)
    }
    setEditingId(null)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!confirm(d.confirmDelete)) return
    await supabase.from('tier_definitions').delete().eq('id', id)
    router.refresh()
  }

  // Swaps this tier's sort_order with its neighbour — reorder is always
  // between two adjacent, already-distinct integers, so a plain two-row
  // swap is enough; no renumbering pass needed.
  async function handleMove(index: number, direction: -1 | 1) {
    const current = tiers[index]
    const target = tiers[index + direction]
    if (!current || !target) return
    await Promise.all([
      supabase.from('tier_definitions').update({ sort_order: target.sortOrder }).eq('id', current.id),
      supabase.from('tier_definitions').update({ sort_order: current.sortOrder }).eq('id', target.id),
    ])
    router.refresh()
  }

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-7">
      <h2 className="mb-5 flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
        <span className="h-px w-5 bg-primary/40" aria-hidden="true" />
        {d.heading}
      </h2>

      <ul className="divide-y divide-border/60">
        {tiers.map((t, i) => (
          <li key={t.id} className="flex items-center gap-2 py-2.5 first:pt-0 last:pb-0">
            <div className="flex shrink-0 items-center gap-0.5">
              <button
                onClick={() => handleMove(i, -1)}
                disabled={i === 0}
                aria-label={d.moveUp}
                className="rounded px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                ↑
              </button>
              <button
                onClick={() => handleMove(i, 1)}
                disabled={i === tiers.length - 1}
                aria-label={d.moveDown}
                className="rounded px-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                ↓
              </button>
            </div>
            {editingId === t.id ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => handleRename(t.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(t.id)}
                className="flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(t.id)
                  setLabelDraft(t.label)
                }}
                className="flex-1 text-left text-sm underline-offset-4 hover:underline"
              >
                {t.label}
              </button>
            )}
            <button onClick={() => handleDelete(t.id)} className="shrink-0 text-xs text-muted-foreground hover:text-destructive">
              {d.delete}
            </button>
          </li>
        ))}
        {tiers.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>

      <form onSubmit={handleAdd} className="mt-4 flex items-center gap-2 border-t pt-4">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={d.addPlaceholder}
          className="flex-1 rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-gold/40"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {d.add}
        </button>
      </form>
    </div>
  )
}
