'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignOutButton({ lang }: { lang: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push(`/${lang}/auth/login`)
    router.refresh()
  }

  return (
    <button
      onClick={handleSignOut}
      className="rounded-lg border bg-background px-3.5 py-2 text-sm font-medium transition-colors hover:bg-muted"
    >
      Sign out
    </button>
  )
}
