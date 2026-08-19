
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDictionary, hasLocale } from '@/lib/i18n'
import { localizePath } from '@/lib/locale'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const metadata = { title: 'Reset password — The Wedding Lab' }

export default async function ResetPasswordPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const dict = await getDictionary(lang)
  const d = dict.auth.reset

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">{d.title}</h1>
        <p className="text-sm text-muted-foreground">{d.subtitle}</p>
      </div>

      <ResetPasswordForm lang={lang} dict={dict} />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href={localizePath(lang, '/auth/login')}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {d.backToSignIn}
        </Link>
      </p>
    </div>
  )
}
