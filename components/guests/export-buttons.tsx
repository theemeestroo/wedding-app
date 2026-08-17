'use client'

import type { Dictionary } from '@/lib/i18n'

export interface ExportRow {
  household: string
  firstName: string
  lastName: string
  isChild: boolean
  city: string
  country: string
  tier: string
  group: string
}

function download(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function toCSV(rows: ExportRow[]): string {
  const headers = ['household', 'firstName', 'lastName', 'isChild', 'city', 'country', 'tier', 'group']
  const escape = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(
      [r.household, r.firstName, r.lastName, String(r.isChild), r.city, r.country, r.tier, r.group]
        .map(escape)
        .join(','),
    )
  }
  return lines.join('\n')
}

export function ExportButtons({ dict, rows }: { dict: Dictionary; rows: ExportRow[] }) {
  const d = dict.guests.export

  return (
    <div className="flex gap-2">
      <button
        onClick={() => download('guests.csv', toCSV(rows), 'text/csv')}
        className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        {d.exportCsv}
      </button>
      <button
        onClick={() => download('guests.json', JSON.stringify(rows, null, 2), 'application/json')}
        className="rounded-lg border bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        {d.exportJson}
      </button>
    </div>
  )
}
