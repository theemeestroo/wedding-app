import Link from 'next/link'

// Placeholder home page — proxy.ts redirects here through /{locale} before
// the marketing site is built.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Wedding Decision Platform</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Figure out the right wedding before you start organising it.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link href="/auth/login" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Sign in
        </Link>
        <Link
          href="/auth/signup"
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
        >
          Get started
        </Link>
      </div>
    </main>
  )
}
