import { getDictionary } from '@/lib/i18n'
import { HomePage as MarketingHomePage } from '@/components/marketing/home-page'

// English-only mirror of app/[lang]/page.tsx — proxy.ts redirects real
// traffic to /{locale} before Next.js resolves this route; it only exists
// as a bare fallback per the (auth)-only bare-route convention (AGENTS.md).
export default async function HomePage() {
  const dict = await getDictionary('en')

  return (
    <MarketingHomePage
      d={dict.home}
      loginHref="/auth/login"
      signupHref="/auth/signup"
      privacyHref="/en/privacy"
    />
  )
}
