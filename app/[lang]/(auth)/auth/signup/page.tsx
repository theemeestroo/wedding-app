
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { SignupForm } from '@/components/auth/signup-form'

export const metadata = { title: 'Create account — Wedding Decision Platform' }

export default async function SignupPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.auth.signup

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-bold tracking-tight">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </div>

      <SignupForm lang={lang} dict={dict} />

      <p className="text-center text-sm text-muted-foreground">
        {d.hasAccount}{' '}
        <Link
          href={localizePath(lang, '/auth/login')}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.signIn}
        </Link>
      </p>
    </div>
  )
}
