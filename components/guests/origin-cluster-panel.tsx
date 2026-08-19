'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'

export interface OriginCluster {
  id: string
  label: string
  householdCount: number
  guestCount: number
}

export function OriginClusterPanel({
  dict,
  projectId,
  clusters,
  unassignedCount,
}: {
  dict: Dictionary
  projectId: string
  clusters: OriginCluster[]
  unassignedCount: number
}) {
  const router = useRouter()
  const d = dict.guests.origins
  const supabase = createClient()
  const [recomputing, setRecomputing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [labelDraft, setLabelDraft] = useState('')

  async function handleRecompute() {
    setRecomputing(true)
    await supabase.rpc('recompute_origin_clusters', { p_project_id: projectId })
    setRecomputing(false)
    router.refresh()
  }

  async function handleRename(clusterId: string) {
    await supabase.from('origin_clusters').update({ label: labelDraft }).eq('id', clusterId)
    setEditingId(null)
    router.refresh()
  }

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-7">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
          <span className="h-px w-5 bg-primary/40" aria-hidden="true" />
          {d.heading}
        </h2>
        <button
          onClick={handleRecompute}
          disabled={recomputing}
          className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
        >
          {recomputing ? d.recomputing : d.recompute}
        </button>
      </div>

      {unassignedCount > 0 && (
        <p className="mb-3 text-xs text-muted-foreground">
          {interpolate(d.unassignedHint, { count: unassignedCount })}
        </p>
      )}

      <ul className="space-y-2">
        {clusters.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
            {editingId === c.id ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => handleRename(c.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleRename(c.id)}
                className="rounded-lg border bg-background px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
              />
            ) : (
              <button
                onClick={() => {
                  setEditingId(c.id)
                  setLabelDraft(c.label)
                }}
                className="text-left underline-offset-4 hover:underline"
              >
                {c.label}
              </button>
            )}
            <span className="shrink-0 text-xs text-muted-foreground">
              {interpolate(d.countSummary, { households: c.householdCount, guests: c.guestCount })}
            </span>
          </li>
        ))}
        {clusters.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>
    </div>
  )
}
