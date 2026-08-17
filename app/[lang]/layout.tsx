import { notFound } from 'next/navigation'
import { hasLocale } from '@/lib/i18n'

export default async function LocaleLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params

  if (!hasLocale(lang)) notFound()

  return <>{children}</>
}
