import Link from 'next/link'
import { Logo } from '@/components/logo'
import { ArchPanel } from '@/components/shared/arch-panel'
import { ThemeToggle } from '@/components/theme-toggle'
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
      <div className="relative flex min-w-0 items-center justify-center px-4 py-16">
        <div className="relative w-full min-w-0 max-w-sm">
          <div className="mb-8 flex w-full items-center justify-between gap-3">
            <Link href="/" className="flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-foreground">
              <Logo size={36} />
              <span className="font-heading text-lg italic text-primary">The Wedding Lab</span>
            </Link>
            <ThemeToggle />
          </div>

          <div className="ambient-shadow border bg-card p-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
