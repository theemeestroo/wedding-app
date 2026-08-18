/**
 * A small hand-drawn sprig flanking a short label — the app's stand-in for
 * the botanical flourishes wedding-brand sites use, done in line art rather
 * than a licensed photo/illustration. Purely decorative.
 */
export function LaurelDivider({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-center gap-3 text-primary/70 ${className}`} aria-hidden="true">
      <Sprig />
      {children}
      <Sprig flip />
    </div>
  )
}

function Sprig({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      width="36"
      height="14"
      viewBox="0 0 36 14"
      fill="none"
      className={flip ? 'scale-x-[-1]' : ''}
    >
      <path d="M0 7 H30" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M9 7 C12 3, 15 3, 18 7" stroke="currentColor" strokeWidth="1.1" opacity="0.7" fill="none" strokeLinecap="round" />
      <path d="M9 7 C12 11, 15 11, 18 7" stroke="currentColor" strokeWidth="1.1" opacity="0.7" fill="none" strokeLinecap="round" />
      <path d="M17 7 C20 3, 23 3, 26 7" stroke="currentColor" strokeWidth="1.1" opacity="0.7" fill="none" strokeLinecap="round" />
      <path d="M17 7 C20 11, 23 11, 26 7" stroke="currentColor" strokeWidth="1.1" opacity="0.7" fill="none" strokeLinecap="round" />
      <circle cx="30" cy="7" r="1.4" fill="currentColor" opacity="0.8" />
    </svg>
  )
}
