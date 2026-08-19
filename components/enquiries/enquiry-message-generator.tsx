'use client'

import { useState } from 'react'
import { interpolate } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'

// PRD §7.2's own examples of venue facts worth confirming — a fixed
// checklist stands in for "expected facts" since venue_facts has no schema.
const CANONICAL_FACT_KEYS = ['capacity', 'curfew', 'catering_policy', 'coach_access'] as const

export function EnquiryMessageGenerator({
  dict,
  venueName,
  existingFactKeys,
}: {
  dict: Dictionary
  venueName: string
  existingFactKeys: string[]
}) {
  const d = dict.enquiries.message
  const normalized = new Set(existingFactKeys.map((k) => k.toLowerCase().trim().replace(/\s+/g, '_')))
  const missing = CANONICAL_FACT_KEYS.filter((key) => !normalized.has(key))

  const [message, setMessage] = useState(() => {
    const lines = [interpolate(d.intro, { venue: venueName })]
    if (missing.length > 0) {
      lines.push('')
      for (const key of missing) lines.push(`- ${d.questions[key]}`)
    }
    lines.push('')
    lines.push(d.outro)
    return lines.join('\n')
  })
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">{d.heading}</h2>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={8}
        className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-gold/40 focus-visible:border-gold"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
        >
          {copied ? d.copied : d.copyMessage}
        </button>
        <a
          href={`mailto:?subject=${encodeURIComponent(interpolate(d.mailtoSubject, { venue: venueName }))}&body=${encodeURIComponent(message)}`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.mailtoLink}
        </a>
      </div>
    </div>
  )
}
