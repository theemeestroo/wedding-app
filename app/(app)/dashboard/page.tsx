import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/sign-out-button'

// Placeholder dashboard — proves the auth guard + signup flow works
// end-to-end. Replace with the real wedding app shell.
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-sm text-muted-foreground">Signed in as {user?.email}</p>
      <SignOutButton lang="en" />
    </main>
  )
}
