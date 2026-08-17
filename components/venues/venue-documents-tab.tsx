'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

export interface VenueDocument {
  id: string
  storage_path: string
  filename: string
  signedUrl: string | null
}

// Module scope, not the component body — the timestamp only needs to make
// concurrent uploads of the same filename collide-free, not be stable across renders.
function buildStoragePath(projectId: string, venueId: string, filename: string): string {
  return `${projectId}/${venueId}/${Date.now()}-${filename}`
}

export function VenueDocumentsTab({
  dict,
  projectId,
  venueId,
  documents,
}: {
  dict: Dictionary
  projectId: string
  venueId: string
  documents: VenueDocument[]
}) {
  const router = useRouter()
  const d = dict.venues.documents
  const supabase = createClient()
  const fileInput = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)

    const path = buildStoragePath(projectId, venueId, file.name)
    const { error: uploadError } = await supabase.storage.from('wedding-documents').upload(path, file)

    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }

    const { error: insertError } = await supabase.from('venue_documents').insert({
      venue_id: venueId,
      storage_path: path,
      filename: file.name,
    })

    setUploading(false)
    if (insertError) {
      setError(insertError.message)
    } else {
      if (fileInput.current) fileInput.current.value = ''
      router.refresh()
    }
  }

  async function handleDelete(doc: VenueDocument) {
    await supabase.storage.from('wedding-documents').remove([doc.storage_path])
    await supabase.from('venue_documents').delete().eq('id', doc.id)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li key={doc.id} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3">
            {doc.signedUrl ? (
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="truncate text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {doc.filename}
              </a>
            ) : (
              <span className="truncate text-sm">{doc.filename}</span>
            )}
            <button onClick={() => handleDelete(doc)} className="shrink-0 text-xs text-muted-foreground hover:text-destructive">
              {dict.common.delete}
            </button>
          </li>
        ))}
        {documents.length === 0 && <p className="text-sm text-muted-foreground">{d.empty}</p>}
      </ul>

      <div>
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted">
          {uploading ? d.uploading : d.upload}
          <input ref={fileInput} type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
        </label>
        {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  )
}
