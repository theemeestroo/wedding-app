'use client'

import { useState } from 'react'
import type { Dictionary } from '@/lib/i18n'
import { VenueOverviewTab, type VenueDetail } from './venue-overview-tab'
import { VenueSourcesTab, type VenueSource } from './venue-sources-tab'
import { VenueFactsTab, type VenueFact } from './venue-facts-tab'
import { VenueDocumentsTab, type VenueDocument } from './venue-documents-tab'
import { VenueNotesTab } from './venue-notes-tab'

interface VenueContact {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string | null
}

type Tab = 'overview' | 'sources' | 'facts' | 'documents' | 'notes'

export function VenueDetailTabs({
  dict,
  venue,
  sources,
  facts,
  contacts,
  documents,
  projectId,
}: {
  lang: string
  dict: Dictionary
  venue: VenueDetail
  sources: VenueSource[]
  facts: VenueFact[]
  contacts: VenueContact[]
  documents: VenueDocument[]
  projectId: string
}) {
  const d = dict.venues.tabs
  const [tab, setTab] = useState<Tab>('overview')

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: d.overview },
    { id: 'sources', label: d.sources, count: sources.length },
    { id: 'facts', label: d.facts, count: facts.length },
    { id: 'documents', label: d.documents, count: documents.length },
    { id: 'notes', label: d.notes },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
        {contacts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {contacts.map((c) => c.name).filter(Boolean).join(', ')}
          </p>
        )}
      </div>

      <div className="flex gap-1 border-b text-sm">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`border-b-2 px-3 py-2 font-medium transition-colors ${
              tab === t.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {typeof t.count === 'number' && t.count > 0 && (
              <span className="ml-1.5 text-xs text-muted-foreground">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div>
        {tab === 'overview' && <VenueOverviewTab dict={dict} venue={venue} />}
        {tab === 'sources' && <VenueSourcesTab dict={dict} venueId={venue.id} sources={sources} />}
        {tab === 'facts' && <VenueFactsTab dict={dict} venueId={venue.id} facts={facts} />}
        {tab === 'documents' && (
          <VenueDocumentsTab dict={dict} projectId={projectId} venueId={venue.id} documents={documents} />
        )}
        {tab === 'notes' && <VenueNotesTab dict={dict} venueId={venue.id} notes={venue.notes} />}
      </div>
    </div>
  )
}
