import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { HomePage as MarketingHomePage } from '@/components/marketing/home-page'

// Marketing homepage — mirrors app/page.tsx for the locale-prefixed route.
export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)

  return (
    <MarketingHomePage
      d={dict.home}
      loginHref={localizePath(lang, '/auth/login')}
      signupHref={localizePath(lang, '/auth/signup')}
      privacyHref={localizePath(lang, '/privacy')}
    />
  )
}
