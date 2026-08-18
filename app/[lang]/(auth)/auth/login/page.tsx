
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { LoginForm } from '@/components/auth/login-form'

export const metadata = { title: 'Sign in — Aisle' }

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.auth.login
  const { next } = await searchParams
  const signupHref = next
    ? `${localizePath(lang, '/auth/signup')}?next=${encodeURIComponent(next)}`
    : localizePath(lang, '/auth/signup')

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </div>

      <LoginForm searchParams={searchParams} lang={lang} dict={dict} next={next} />

      <p className="text-center text-sm text-muted-foreground">
        {d.noAccount}{' '}
        <Link
          href={signupHref}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.signUp}
        </Link>
      </p>
    </div>
  )
}
