import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ArchPanel } from '@/components/shared/arch-panel'
import { getDictionary, DEFAULT_LOCALE } from '@/lib/i18n'

// Auth pages depend on Supabase at runtime — never statically prerender.
export const dynamic = 'force-dynamic'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const dict = await getDictionary(DEFAULT_LOCALE)

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Decorative panel — desktop only */}
      <div className="relative hidden items-center justify-center border-r bg-secondary/40 p-12 lg:flex">
        <ArchPanel
          eyebrow={dict.home.heroEyebrow}
          tagline={dict.home.footerTagline}
          className="h-[32rem] w-full max-w-sm"
        />
      </div>

      {/* Form column */}
      <div className="paper-grain relative flex min-w-0 items-center justify-center px-4 py-16">
        <div className="gradient-hero absolute inset-0 opacity-[0.05] lg:hidden" />
        <div className="dot-pattern absolute inset-0 opacity-30 lg:hidden" />

        <div className="relative w-full min-w-0 max-w-sm">
          <div className="mb-8 flex flex-col items-center gap-3 lg:items-start">
            <Link href="/" className="flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground">
              <Logo size={36} />
              <span className="font-heading text-lg italic text-foreground">Aisle</span>
            </Link>
          </div>

          <div className="invite-frame rounded-2xl border bg-card p-8 shadow-xl shadow-primary/5">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
