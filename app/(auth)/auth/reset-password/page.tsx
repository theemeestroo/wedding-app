import { ResetPasswordForm } from '@/components/auth/reset-password-form'
import { getDictionary } from '@/lib/i18n'
import Link from 'next/link'

export const metadata = { title: 'Reset password — Wedding Decision Platform' }

export default async function ResetPasswordPage() {
  const dict = await getDictionary('en')

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-bold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We&apos;ll help you get back in</p>
      </div>

      <ResetPasswordForm lang="en" dict={dict} />

      <p className="text-center text-sm text-muted-foreground">
        <Link
          href="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  )
}
