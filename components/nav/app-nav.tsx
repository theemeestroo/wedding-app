'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProject } from '@/lib/project-context'
import { useTranslations } from '@/lib/i18n-context'
import { SignOutButton } from '@/components/sign-out-button'
import { Logo } from '@/components/logo'

export function AppNav({ lang }: { lang: string }) {
  const project = useProject()
  const dict = useTranslations()
  const pathname = usePathname()
  const d = dict.nav

  const links = [
    { href: `/${lang}/dashboard`, label: d.dashboard },
    { href: `/${lang}/guests`, label: d.guests },
    { href: `/${lang}/plans`, label: d.plans },
    { href: `/${lang}/venues`, label: d.venues },
    { href: `/${lang}/enquiries`, label: d.enquiries },
    { href: `/${lang}/options`, label: d.options },
    { href: `/${lang}/compare`, label: d.compare },
    { href: `/${lang}/settings/members`, label: d.members },
  ]

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3.5">
        <div className="flex items-center gap-7">
          <Link href={`/${lang}/dashboard`} className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="font-heading text-base italic tracking-tight text-foreground">
              {project.name}
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-xs font-medium uppercase tracking-[0.1em] text-muted-foreground">
            {links.map((link) => {
              const active = pathname?.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative py-1 transition-colors hover:text-foreground ${
                    active ? 'text-primary' : ''
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-[15px] left-0 right-0 h-[2px] bg-primary" aria-hidden="true" />
                  )}
                </Link>
              )
            })}
          </nav>
        </div>
        <SignOutButton lang={lang} />
      </div>
    </header>
  )
}
