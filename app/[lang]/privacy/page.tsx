import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'

export const metadata = { title: 'Privacy — The Wedding Lab' }

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.privacy

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">{d.title}</h1>
      <p className="text-sm text-muted-foreground">{d.intro}</p>
      <h2 className="text-lg font-semibold">{d.whatHeading}</h2>
      <p className="text-sm text-muted-foreground">{d.whatBody}</p>
      <h2 className="text-lg font-semibold">{d.whyHeading}</h2>
      <p className="text-sm text-muted-foreground">{d.whyBody}</p>
      <h2 className="text-lg font-semibold">{d.deletionHeading}</h2>
      <p className="text-sm text-muted-foreground">{d.deletionBody}</p>
      <h2 className="text-lg font-semibold">{d.contactHeading}</h2>
      <p className="text-sm text-muted-foreground">{d.contactBody}</p>
    </main>
  )
}
