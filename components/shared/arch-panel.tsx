import { Logo } from '@/components/logo'
import { LaurelDivider } from '@/components/shared/laurel-divider'

/**
 * A tall arched "window" filled with wash, grain and a laurel — the app's
 * stand-in for the framed photography wedding-brand sites lean on. No
 * licensed imagery involved: colour, texture and line art only.
 */
export function ArchPanel({
  eyebrow,
  tagline,
  /** 'start' for panels partly covered by an overlapping card (keeps the
   *  mark clear of the overlap); 'center' when the panel stands alone. */
  align = 'center',
  className = '',
}: {
  eyebrow?: string
  tagline?: string
  align?: 'start' | 'center'
  className?: string
}) {
  return (
    <div className={`paper-grain arch-top relative overflow-hidden border border-primary/15 ${className}`}>
      <div className="gradient-hero absolute inset-0 opacity-70" />
      <div className="dot-pattern absolute inset-0 opacity-25" />
      <div
        className={`relative flex h-full flex-col items-center gap-5 px-10 py-14 text-center ${
          align === 'start' ? 'justify-start' : 'justify-center'
        }`}
      >
        <Logo size={52} />
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        )}
        {tagline && (
          <p className="max-w-[15rem] font-heading text-2xl italic leading-snug text-foreground/85">
            {tagline}
          </p>
        )}
        <LaurelDivider />
      </div>
    </div>
  )
}
