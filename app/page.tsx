// Placeholder home page — proxy.ts redirects here through /{locale} before
// the marketing site is built.
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Wedding Decision Platform</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Figure out the right wedding before you start organising it.
      </p>
    </main>
  )
}
