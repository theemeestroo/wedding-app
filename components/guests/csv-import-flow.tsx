'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { parseCSV } from '@/lib/csv'
import { createClient } from '@/lib/supabase/client'
import { localizePath } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'

type FieldKey = 'firstName' | 'lastName' | 'householdName' | 'city' | 'country' | 'tier' | 'group' | 'isChild' | 'ignore'

const FIELD_KEYS: FieldKey[] = [
  'firstName',
  'lastName',
  'householdName',
  'city',
  'country',
  'tier',
  'group',
  'isChild',
  'ignore',
]

interface SuggestedHousehold {
  key: string
  name: string
  city: string
  country: string
  tier: string
  group: string
  members: { firstName: string; lastName: string; isChild: boolean }[]
}

type Step = 'upload' | 'mapping' | 'review' | 'importing' | 'done'

function normalize(s: string): string {
  return s.trim().toLowerCase()
}

export function CsvImportFlow({
  lang,
  dict,
  projectId,
}: {
  lang: string
  dict: Dictionary
  projectId: string
}) {
  const router = useRouter()
  const d = dict.guests.import
  const supabase = createClient()

  const [step, setStep] = useState<Step>('upload')
  const [csvText, setCsvText] = useState('')
  const [rows, setRows] = useState<string[][]>([])
  const [mapping, setMapping] = useState<FieldKey[]>([])
  const [households, setHouseholds] = useState<SuggestedHousehold[]>([])
  const [progress, setProgress] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleParse() {
    const parsed = parseCSV(csvText)
    if (parsed.length < 2) {
      setError(d.emptyFileError)
      return
    }
    setRows(parsed)
    // Best-effort auto-detect from header text, defaulting to ignore.
    const header = parsed[0].map((h) => h.toLowerCase())
    const guesses: FieldKey[] = header.map((h) => {
      if (h.includes('first')) return 'firstName'
      if (h.includes('last') || h.includes('surname')) return 'lastName'
      if (h.includes('household') || h.includes('family')) return 'householdName'
      if (h.includes('city') || h.includes('town')) return 'city'
      if (h.includes('countr')) return 'country'
      if (h.includes('tier')) return 'tier'
      if (h.includes('group') || h.includes('side')) return 'group'
      if (h.includes('child')) return 'isChild'
      return 'ignore'
    })
    setMapping(guesses)
    setError(null)
    setStep('mapping')
  }

  function handleConfirmMapping() {
    const colIndex = (key: FieldKey) => mapping.findIndex((m) => m === key)
    const firstNameCol = colIndex('firstName')
    if (firstNameCol === -1) {
      setError(d.firstNameRequiredError)
      return
    }
    const lastNameCol = colIndex('lastName')
    const householdNameCol = colIndex('householdName')
    const cityCol = colIndex('city')
    const countryCol = colIndex('country')
    const tierCol = colIndex('tier')
    const groupCol = colIndex('group')
    const childCol = colIndex('isChild')

    const grouped = new Map<string, SuggestedHousehold>()

    for (const row of rows.slice(1)) {
      const firstName = row[firstNameCol]?.trim() ?? ''
      if (!firstName) continue
      const lastName = lastNameCol >= 0 ? (row[lastNameCol]?.trim() ?? '') : ''
      const city = cityCol >= 0 ? (row[cityCol]?.trim() ?? '') : ''
      const country = countryCol >= 0 ? (row[countryCol]?.trim() ?? '') : ''
      const tier = tierCol >= 0 ? (row[tierCol]?.trim().toUpperCase() ?? '') : ''
      const group = groupCol >= 0 ? (row[groupCol]?.trim() ?? '') : ''
      const isChild = childCol >= 0 ? /^(y|yes|true|1)$/i.test(row[childCol]?.trim() ?? '') : false
      const householdName = householdNameCol >= 0 ? (row[householdNameCol]?.trim() ?? '') : ''

      const key = `${normalize(lastName)}|${normalize(city)}`
      const existing = grouped.get(key)
      if (existing) {
        existing.members.push({ firstName, lastName, isChild })
      } else {
        grouped.set(key, {
          key,
          name: householdName || (lastName ? `${lastName} household` : firstName),
          city,
          country,
          tier: ['A', 'B', 'C', 'D'].includes(tier) ? tier : 'B',
          group,
          members: [{ firstName, lastName, isChild }],
        })
      }
    }

    setHouseholds(Array.from(grouped.values()))
    setError(null)
    setStep('review')
  }

  function updateHousehold(key: string, patch: Partial<SuggestedHousehold>) {
    setHouseholds((prev) => prev.map((h) => (h.key === key ? { ...h, ...patch } : h)))
  }

  async function handleImport() {
    setStep('importing')
    setError(null)

    // Geocode each unique city/country pair sequentially — Nominatim's usage
    // policy caps at 1 req/sec, and the cache means repeats across imports
    // (and across every project on this app) cost nothing after the first.
    const uniqueLocations = new Map<string, { city: string; country: string }>()
    for (const h of households) {
      if (h.city && h.country) uniqueLocations.set(`${normalize(h.city)}|${normalize(h.country)}`, h)
    }

    const coords = new Map<string, { latitude: number; longitude: number }>()
    let done = 0
    for (const [key, loc] of uniqueLocations) {
      setProgress(`${d.geocoding} (${done + 1}/${uniqueLocations.size})`)
      try {
        const res = await fetch(`/api/geocode?city=${encodeURIComponent(loc.city)}&country=${encodeURIComponent(loc.country)}`)
        const geo = await res.json()
        if (geo.ok) coords.set(key, { latitude: geo.latitude, longitude: geo.longitude })
      } catch {
        // Non-fatal — household still imports, just without coordinates.
      }
      done++
      if (done < uniqueLocations.size) await new Promise((r) => setTimeout(r, 1100))
    }

    setProgress(d.savingHouseholds)

    for (const h of households) {
      const locKey = `${normalize(h.city)}|${normalize(h.country)}`
      const coord = coords.get(locKey)

      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          project_id: projectId,
          name: h.name,
          home_city: h.city || null,
          home_country: h.country || null,
          latitude: coord?.latitude ?? null,
          longitude: coord?.longitude ?? null,
          tier: h.tier,
          group_label: h.group || null,
        })
        .select('id')
        .single()

      if (householdError || !household) {
        setError(householdError?.message ?? d.importError)
        setStep('review')
        return
      }

      const { error: guestsError } = await supabase.from('guests').insert(
        h.members.map((m) => ({
          household_id: household.id,
          first_name: m.firstName,
          last_name: m.lastName || null,
          is_child: m.isChild,
        })),
      )

      if (guestsError) {
        setError(guestsError.message)
        setStep('review')
        return
      }
    }

    setStep('done')
  }

  if (step === 'upload') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{d.uploadHint}</p>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          rows={10}
          placeholder={d.pastePlaceholder}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 font-mono text-xs outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return
            file.text().then(setCsvText)
          }}
          className="text-sm"
        />
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          onClick={handleParse}
          disabled={!csvText.trim()}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
        >
          {d.parseButton}
        </button>
      </div>
    )
  }

  if (step === 'mapping') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{d.mappingHint}</p>
        <div className="space-y-2">
          {rows[0].map((header, i) => (
            <div key={i} className="flex items-center justify-between gap-3 rounded-xl border bg-card px-4 py-2.5">
              <span className="text-sm font-medium">{header || `Column ${i + 1}`}</span>
              <select
                value={mapping[i]}
                onChange={(e) =>
                  setMapping((prev) => prev.map((m, idx) => (idx === i ? (e.target.value as FieldKey) : m)))
                }
                className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
              >
                {FIELD_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {d.fieldLabels[k]}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          onClick={handleConfirmMapping}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
        >
          {d.continueButton}
        </button>
      </div>
    )
  }

  if (step === 'review') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{d.reviewHint}</p>
        <div className="space-y-3">
          {households.map((h) => (
            <div key={h.key} className="rounded-xl border bg-card p-4">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={h.name}
                  onChange={(e) => updateHousehold(h.key, { name: e.target.value })}
                  className="rounded-lg border bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <select
                  value={h.tier}
                  onChange={(e) => updateHousehold(h.key, { tier: e.target.value })}
                  className="rounded-lg border bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                >
                  {['A', 'B', 'C', 'D'].map((t) => (
                    <option key={t} value={t}>
                      {dict.guests.tierLabel} {t}
                    </option>
                  ))}
                </select>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {[h.city, h.country].filter(Boolean).join(', ') || d.noLocation}
              </p>
              <ul className="mt-2 text-sm">
                {h.members.map((m, i) => (
                  <li key={i}>
                    {m.firstName} {m.lastName}
                    {m.isChild && <span className="ml-1 text-xs text-muted-foreground">({d.childBadge})</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          onClick={handleImport}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
        >
          {d.confirmImport}
        </button>
      </div>
    )
  }

  if (step === 'importing') {
    return <p className="text-sm text-muted-foreground">{progress || dict.common.loading}</p>
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">{d.done}</p>
      <a
        href={localizePath(lang, '/guests')}
        className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
        onClick={() => router.refresh()}
      >
        {d.backToGuests}
      </a>
    </div>
  )
}
