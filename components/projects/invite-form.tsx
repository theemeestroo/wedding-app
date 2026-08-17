'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Dictionary } from '@/lib/i18n'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export function InviteForm({
  lang,
  dict,
  projectId,
  inviterProfileId,
}: {
  lang: string
  dict: Dictionary
  projectId: string
  inviterProfileId: string
}) {
  const router = useRouter()
  const d = dict.project.members
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'partner' | 'viewer'>('partner')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const token = generateToken()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { error } = await supabase.from('project_invitations').insert({
      project_id: projectId,
      email: email.trim().toLowerCase(),
      role,
      token,
      invited_by: inviterProfileId,
      expires_at: expiresAt,
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setInviteLink(`${window.location.origin}/${lang}/auth/accept-invite?token=${token}`)
    setEmail('')
    router.refresh()
  }

  async function handleCopy() {
    if (!inviteLink) return
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inviteLink) {
    return (
      <div className="space-y-3 rounded-xl border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">{d.linkGenerated}</p>
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={inviteLink}
            className="w-full rounded-lg border bg-background px-3 py-2 text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={handleCopy}
            className="shrink-0 rounded-lg border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {copied ? d.copied : d.copyLink}
          </button>
        </div>
        <a
          href={`mailto:?subject=${encodeURIComponent(d.mailtoSubject)}&body=${encodeURIComponent(inviteLink)}`}
          className="inline-block text-sm text-primary underline-offset-4 hover:underline"
        >
          {d.mailtoLink}
        </a>
        <button
          type="button"
          onClick={() => setInviteLink(null)}
          className="block text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {d.inviteAnother}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={d.emailPlaceholder}
          className="w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'partner' | 'viewer')}
          className="rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary/50"
        >
          <option value="partner">{d.rolePartner}</option>
          <option value="viewer">{d.roleViewer}</option>
        </select>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90 disabled:opacity-50"
      >
        {loading ? d.inviting : d.inviteSubmit}
      </button>
    </form>
  )
}
