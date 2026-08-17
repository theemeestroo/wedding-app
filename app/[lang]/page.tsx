import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'

// Placeholder home page — mirrors app/page.tsx for the locale-prefixed route.
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.home

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Wedding Decision Platform</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Figure out the right wedding before you start organising it.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Link
          href={localizePath(lang, '/auth/login')}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.signIn}
        </Link>
        <Link
          href={localizePath(lang, '/auth/signup')}
          className="inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/20 transition-all hover:opacity-90"
        >
          {d.getStarted}
        </Link>
      </div>
    </main>
  )
}
