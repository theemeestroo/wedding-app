'use client'

import Link from 'next/link'
import { useProject } from '@/lib/project-context'
import { useTranslations } from '@/lib/i18n-context'
import { SignOutButton } from '@/components/sign-out-button'

export function AppNav({ lang }: { lang: string }) {
  const project = useProject()
  const dict = useTranslations()
  const d = dict.nav

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <span className="font-semibold tracking-tight">{project.name}</span>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href={`/${lang}/dashboard`} className="transition-colors hover:text-foreground">
              {d.dashboard}
            </Link>
            <Link href={`/${lang}/venues`} className="transition-colors hover:text-foreground">
              {d.venues}
            </Link>
            <Link href={`/${lang}/enquiries`} className="transition-colors hover:text-foreground">
              {d.enquiries}
            </Link>
            <Link href={`/${lang}/settings/members`} className="transition-colors hover:text-foreground">
              {d.members}
            </Link>
          </nav>
        </div>
        <SignOutButton lang={lang} />
      </div>
    </header>
  )
}
