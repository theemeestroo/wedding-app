import Link from 'next/link'
import { Logo } from '@/components/logo'

// Auth pages depend on Supabase at runtime — never statically prerender.
export const dynamic = 'force-dynamic'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Background decoration */}
      <div className="gradient-hero absolute inset-0 opacity-[0.03]" />
      <div className="dot-pattern absolute inset-0" />

      <div className="relative w-full max-w-sm">
        {/* Back to home */}
        <div className="mb-8 flex justify-center">
          <Link href="/" className="text-muted-foreground transition-colors hover:text-foreground">
            <Logo size={40} />
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-xl shadow-primary/5">
          {children}
        </div>
      </div>
    </div>
  )
}
