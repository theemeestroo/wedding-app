type Confidence = 'guess' | 'researched' | 'confirmed' | 'contracted'

const CONFIDENCE_STYLES: Record<Confidence, string> = {
  guess: 'bg-muted text-muted-foreground',
  researched: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-emerald-100 text-emerald-800',
  contracted: 'bg-primary/10 text-primary',
}

export function ConfidenceBadge({ confidence, label }: { confidence: Confidence; label: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${CONFIDENCE_STYLES[confidence]}`}>
      {label}
    </span>
  )
}
