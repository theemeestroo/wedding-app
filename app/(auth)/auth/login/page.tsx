import { LoginForm } from '@/components/auth/login-form'
import { getDictionary } from '@/lib/i18n'
import Link from 'next/link'

export const metadata = { title: 'Sign in — The Wedding Lab' }

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const dict = await getDictionary('en')

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="font-heading text-xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </div>

      <LoginForm searchParams={searchParams} lang="en" dict={dict} />

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/signup"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
