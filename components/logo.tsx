// Wax-seal monogram: a ring in the accent ink around an ampersand, set in the
// display serif — two becoming one, the app's whole premise in one glyph.
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full border bg-primary font-heading italic text-primary-foreground ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.55, borderWidth: Math.max(1, size * 0.03) }}
    >
      &amp;
    </div>
  )
}
