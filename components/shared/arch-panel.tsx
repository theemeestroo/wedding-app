import { Logo } from '@/components/logo'
import { LaurelDivider } from '@/components/shared/laurel-divider'

/**
 * A tall Midnight Plum panel, hairline gold border, the wax-stamp mark at
 * its centre — the app's stand-in for the framed photography wedding-brand
 * sites lean on. No licensed imagery involved: the stamp itself is the
 * "photograph".
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
    <div className={`ink-band relative overflow-hidden border border-gold/30 ${className}`}>
      <div
        className={`relative flex h-full flex-col items-center gap-5 px-10 py-14 text-center ${
          align === 'start' ? 'justify-start' : 'justify-center'
        }`}
      >
        <Logo size={96} className="border-gold/50" />
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">{eyebrow}</p>
        )}
        {tagline && (
          <p className="gold-gradient-text max-w-[15rem] font-heading text-2xl italic leading-snug">
            {tagline}
          </p>
        )}
        <LaurelDivider />
      </div>
    </div>
  )
}
