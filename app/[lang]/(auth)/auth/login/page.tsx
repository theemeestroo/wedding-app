
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = { title: 'Sign in — Wedding Decision Platform' }

export default async function LoginPage({
  params,
  searchParams,
}: { params: Promise<{ lang: string }>; searchParams: Promise<{ error?: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.auth.login

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-bold tracking-tight">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </div>

      <LoginForm searchParams={searchParams} lang={lang} dict={dict} />

      <p className="text-center text-sm text-muted-foreground">
        {d.noAccount}{' '}
        <Link
          href={localizePath(lang, '/auth/signup')}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.signUp}
        </Link>
      </p>
    </div>
  )
}
