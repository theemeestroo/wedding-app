// Placeholder logo — swap for real branding once the wedding app has a visual identity.
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-primary font-heading font-bold text-primary-foreground ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      W
    </div>
  )
}
