'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

const CURRENCIES = ['GBP', 'EUR', 'USD', 'AUD', 'CAD', 'CHF']

export function CreateProjectForm({ lang, dict }: { lang: string; dict: Dictionary }) {
  const router = useRouter()
  const d = dict.project.create
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('GBP')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.rpc('create_project', {
      p_name: name,
      p_currency: currency,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push(`/${lang}/dashboard`)
      router.refresh()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="project-name" className="text-sm font-medium">
          {d.nameLabel}
        </label>
        <input
          id="project-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={d.namePlaceholder}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="project-currency" className="text-sm font-medium">
          {d.currencyLabel}
        </label>
        <select
          id="project-currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          {CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading ? d.loading : d.submit}
      </button>
    </form>
  )
}
