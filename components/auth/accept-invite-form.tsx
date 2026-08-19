'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { interpolate } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'

type State =
  | { status: 'loading' }
  | { status: 'invalid'; reason: string }
  | { status: 'needs_auth'; projectName: string; role: string }
  | { status: 'email_mismatch'; projectName: string; inviteEmail: string; currentEmail: string }
  | { status: 'ready'; projectName: string; role: string }
  | { status: 'accepting' }
  | { status: 'error'; message: string }

export function AcceptInviteForm({
  lang,
  dict,
  token,
}: {
  lang: string
  dict: Dictionary
  token: string | null
}) {
  const router = useRouter()
  const d = dict.invite.accept
  const supabase = createClient()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    async function load() {
      if (!token) {
        setState({ status: 'invalid', reason: 'no_token' })
        return
      }

      const res = await fetch(`/api/invitations/${encodeURIComponent(token)}`)
      const data = await res.json()

      if (!data.valid) {
        setState({ status: 'invalid', reason: data.reason })
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setState({ status: 'needs_auth', projectName: data.projectName, role: data.role })
        return
      }

      if ((user.email ?? '').toLowerCase() !== (data.email ?? '').toLowerCase()) {
        setState({
          status: 'email_mismatch',
          projectName: data.projectName,
          inviteEmail: data.email,
          currentEmail: user.email ?? '',
        })
        return
      }

      setState({ status: 'ready', projectName: data.projectName, role: data.role })
    }

    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleAccept() {
    if (!token) return
    setState({ status: 'accepting' })
    const { error } = await supabase.rpc('accept_project_invitation', { p_token: token })
    if (error) {
      setState({ status: 'error', message: error.message })
      return
    }
    router.push(`/${lang}/dashboard`)
    router.refresh()
  }

  const nextParam = `/${lang}/auth/accept-invite?token=${encodeURIComponent(token ?? '')}`

  if (state.status === 'loading' || state.status === 'accepting') {
    return <p className="py-4 text-center text-sm text-muted-foreground">{dict.common.loading}</p>
  }

  if (state.status === 'invalid') {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">{d.invalid[state.reason as keyof typeof d.invalid] ?? d.invalid.not_found}</p>
        <Link href={`/${lang}/auth/login`} className="btn-tertiary text-sm font-medium">
          {d.backToLogin}
        </Link>
      </div>
    )
  }

  if (state.status === 'error') {
    return <p role="alert" className="text-center text-sm text-destructive">{state.message}</p>
  }

  if (state.status === 'needs_auth') {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          {interpolate(d.invitedTo, { project: state.projectName, role: state.role })}
        </p>
        <div className="flex flex-col gap-2">
          <Link
            href={`/${lang}/auth/signup?next=${encodeURIComponent(nextParam)}`}
            className="btn-primary inline-flex items-center justify-center py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em]"
          >
            {d.signUpToAccept}
          </Link>
          <Link
            href={`/${lang}/auth/login?next=${encodeURIComponent(nextParam)}`}
            className="btn-tertiary text-sm font-medium"
          >
            {d.logInToAccept}
          </Link>
        </div>
      </div>
    )
  }

  if (state.status === 'email_mismatch') {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          {interpolate(d.emailMismatch, { inviteEmail: state.inviteEmail, currentEmail: state.currentEmail })}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">
        {interpolate(d.invitedTo, { project: state.projectName, role: state.role })}
      </p>
      <button
        onClick={handleAccept}
        className="btn-primary inline-flex w-full items-center justify-center py-2.5 text-[11px] font-semibold uppercase tracking-[0.15em]"
      >
        {d.acceptButton}
      </button>
    </div>
  )
}
