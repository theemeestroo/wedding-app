'use client'

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

type Mode = 'password' | 'magic'

export function LoginForm({
  searchParams,
  lang,
  dict,
  next,
}: {
  searchParams: Promise<{ error?: string }>
  lang: string
  dict: Dictionary
  /** Where to land after auth — defaults to the dashboard. Used by flows like accept-invite. */
  next?: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const d = dict.auth.login
  const supabase = createClient()
  const destination = next || `/${lang}/dashboard`

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      router.push(destination)
      router.refresh()
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMessage(d.magicLinkSent)
    }
  }

  async function handleOAuth(provider: 'apple' | 'google') {
    setError(null)
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    })
  }

  const { error: urlError } = use(searchParams)

  return (
    <div className="space-y-4">
      {/* Error from callback redirect */}
      <URLError error={urlError} />

      {/* Tab toggle */}
      <div className="flex border-b text-[11px] font-semibold uppercase tracking-[0.15em]">
        <button
          type="button"
          onClick={() => { setMode('password'); setError(null); setMessage(null) }}
          className={`flex-1 border-b-2 py-2.5 transition-colors ${
            mode === 'password'
              ? 'border-gold text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {d.tabPassword}
        </button>
        <button
          type="button"
          onClick={() => { setMode('magic'); setError(null); setMessage(null) }}
          className={`flex-1 border-b-2 py-2.5 transition-colors ${
            mode === 'magic'
              ? 'border-gold text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          {d.tabMagic}
        </button>
      </div>

      {message ? (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {message}
        </div>
      ) : (
        <form
          onSubmit={mode === 'password' ? handlePasswordSignIn : handleMagicLink}
          className="space-y-3"
        >
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

          {mode === 'password' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-[11px] font-semibold uppercase tracking-[0.15em] text-foreground">
                  {d.passwordLabel}
                </label>
                <Link
                  href={`/${lang}/auth/reset-password`}
                  className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gold hover:text-primary"
                >
                  {d.forgotPassword}
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-regency py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                placeholder={d.passwordPlaceholder}
              />
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 text-[11px] font-semibold uppercase tracking-[0.15em] disabled:opacity-50"
          >
            {loading
              ? mode === 'password' ? d.loadingPassword : d.loadingMagic
              : mode === 'password'
              ? d.submitPassword
              : d.submitMagic}
          </button>
        </form>
      )}

      {/* OAuth divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-gold/30" />
        </div>
        <div className="relative flex justify-center text-[11px] uppercase tracking-[0.15em]">
          <span className="bg-card px-2 text-muted-foreground">{dict.common.or}</span>
        </div>
      </div>

      {/* OAuth buttons */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => handleOAuth('apple')}
          className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium"
        >
          <AppleIcon />
          {d.continueWithApple}
        </button>
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          className="btn-secondary flex w-full items-center justify-center gap-2 py-2.5 text-sm font-medium"
        >
          <GoogleIcon />
          {d.continueWithGoogle}
        </button>
      </div>
    </div>
  )
}

function URLError({ error }: { error?: string }) {
  if (!error) return null
  return (
    <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {decodeURIComponent(error)}
    </div>
  )
}

function AppleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
