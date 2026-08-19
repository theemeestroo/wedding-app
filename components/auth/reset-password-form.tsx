'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

export function ResetPasswordForm({
  lang,
  dict,
}: {
  lang: string
  dict: Dictionary
}) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)

  const d = dict.auth.reset
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasRecoverySession(!!session)
      setSessionChecked(true)
    })
  }, [supabase])

  async function handleRequestReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/${lang}/auth/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage(d.resetLinkSent)
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(d.passwordError)
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (error) {
      setError(error.message)
    } else {
      router.push(`/${lang}/dashboard`)
      router.refresh()
    }
  }

  if (!sessionChecked) {
    return <div className="py-4 text-center text-sm text-muted-foreground">{dict.common.loading}</div>
  }

  if (message) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        {message}
      </div>
    )
  }

  if (hasRecoverySession) {
    return (
      <form onSubmit={handleUpdatePassword} className="space-y-3">
        <p className="text-sm text-muted-foreground">{d.newPasswordPrompt}</p>
        <div className="space-y-1.5">
          <label htmlFor="new-password" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground">
            {d.newPasswordLabel}
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-regency py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            placeholder={d.newPasswordPlaceholder}
          />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 text-[11px] font-semibold uppercase tracking-[0.15em] disabled:opacity-50"
        >
          {loading ? d.loadingUpdate : d.submitUpdate}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleRequestReset} className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground">
          {d.emailLabel}
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-regency py-2.5 text-sm outline-none placeholder:text-muted-foreground"
          placeholder={d.emailPlaceholder}
        />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-3 text-[11px] font-semibold uppercase tracking-[0.15em] disabled:opacity-50"
      >
        {loading ? d.loadingRequest : d.submitRequest}
      </button>
    </form>
  )
}
