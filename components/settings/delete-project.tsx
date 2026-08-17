'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

type SupabaseClient = ReturnType<typeof createClient>

// Storage has no real folders — list() returns "folder" entries (id: null)
// one path segment at a time, so removing every object under a prefix means
// walking down recursively until real objects (id set) are found.
async function listAllObjectPaths(supabase: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const { data } = await supabase.storage.from(bucket).list(prefix)
  const paths: string[] = []
  for (const entry of data ?? []) {
    const fullPath = `${prefix}/${entry.name}`
    if (entry.id === null) {
      paths.push(...(await listAllObjectPaths(supabase, bucket, fullPath)))
    } else {
      paths.push(fullPath)
    }
  }
  return paths
}

export function DeleteProject({
  dict,
  projectId,
  projectName,
}: {
  dict: Dictionary
  projectId: string
  projectName: string
}) {
  const router = useRouter()
  const d = dict.settings.deleteProject
  const supabase = createClient()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setDeleting(true)
    setError(null)

    try {
      const paths = await listAllObjectPaths(supabase, 'wedding-documents', projectId)
      if (paths.length > 0) {
        await supabase.storage.from('wedding-documents').remove(paths)
      }
    } catch {
      // Non-fatal — proceed with the DB delete either way; an orphaned
      // storage object left behind isn't a data-retention risk on its own
      // (the metadata row that named it is about to be gone regardless).
    }

    const { error } = await supabase.from('projects').delete().eq('id', projectId)

    if (error) {
      setError(error.message)
      setDeleting(false)
      return
    }

    router.push('/')
  }

  return (
    <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
      <h2 className="text-sm font-medium uppercase tracking-wide text-destructive">{d.heading}</h2>
      <p className="text-sm text-muted-foreground">{d.warning}</p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder={projectName}
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:border-destructive/50"
      />
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button
        onClick={handleDelete}
        disabled={confirmText !== projectName || deleting}
        className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground shadow-sm transition-all hover:opacity-90 disabled:opacity-50"
      >
        {deleting ? d.deleting : d.confirmButton}
      </button>
    </div>
  )
}
