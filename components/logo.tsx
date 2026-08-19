import Image from 'next/image'

// Wax-seal stamp mark: the light stamp (dark plum seal on cream) for light
// surfaces, the dark stamp (gold seal on dark plum) for dark ones — swapped
// via the `dark:` variant so the mark always reads against its background.
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-gold/40 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/logo-light-stamp.png"
        alt="The Wedding Lab"
        fill
        sizes={`${size}px`}
        className="object-cover dark:hidden"
      />
      <Image
        src="/brand/logo-dark-stamp.png"
        alt="The Wedding Lab"
        fill
        sizes={`${size}px`}
        className="hidden object-cover dark:block"
      />
    </div>
  )
}
