import { notFound } from 'next/navigation'
import { hasLocale } from '@/lib/i18n'

// Placeholder home page — mirrors app/page.tsx for the locale-prefixed route.
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Wedding Decision Platform</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Figure out the right wedding before you start organising it.
      </p>
    </main>
  )
}
