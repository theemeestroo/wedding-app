import Link from 'next/link'
import { localizePath } from '@/lib/locale'
import type { Dictionary } from '@/lib/i18n'

export function GdprNotice({ lang, dict }: { lang: string; dict: Dictionary }) {
  const d = dict.guests.notice

  return (
    <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
      {d.text}{' '}
      <Link href={localizePath(lang, '/privacy')} className="underline-offset-4 hover:underline">
        {d.learnMore}
      </Link>
    </p>
  )
}
