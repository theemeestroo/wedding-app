import Link from 'next/link'

import { getDictionary, hasLocale } from '@/lib/i18n'
import { I18nProvider } from '@/lib/i18n-context'
import { Logo } from '@/components/logo'
import { redirect } from 'next/navigation'

export default async function AuthLayout({
  children,
  params,
}: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) redirect('/en/auth/login')

  const dict = await getDictionary(lang)

  return (
    <I18nProvider dict={dict}>
      <div className="relative min-h-screen flex items-center justify-center px-4">
        {/* Background decoration */}
        <div className="gradient-hero absolute inset-0 opacity-[0.03]" />
        <div className="dot-pattern absolute inset-0" />

        <div className="relative w-full max-w-sm">
          {/* Back to home */}
          <div className="mb-8 flex justify-center">
            <Link href={`/${lang}`} className="text-muted-foreground transition-colors hover:text-foreground">
              <Logo size={40} />
            </Link>
          </div>

          {/* Card */}
          <div className="rounded-2xl border bg-card p-8 shadow-xl shadow-primary/5">
            {children}
          </div>
        </div>
      </div>
    </I18nProvider>
  )
}
