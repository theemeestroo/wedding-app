import { SignupForm } from '@/components/auth/signup-form'
import { getDictionary } from '@/lib/i18n'
import Link from 'next/link'

export const metadata = { title: 'Create account — Wedding Decision Platform' }

export default async function SignupPage() {
  const dict = await getDictionary('en')

  return (
    <div className="space-y-6">
      <div className="space-y-1.5 text-center">
        <h1 className="text-xl font-bold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start planning your wedding</p>
      </div>

      <SignupForm lang="en" dict={dict} />

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link
          href="/auth/login"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
