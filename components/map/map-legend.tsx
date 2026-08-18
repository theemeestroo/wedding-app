/**
 * Layer toggles + the coverage-ring caveat PRD §11.3 explicitly asks for
 * when shipping true circles instead of real irregular contours: "ship true
 * circles with an explicit caveat in the legend."
 */

import type { Dictionary } from '@/lib/i18n'
import type { LayerVisibility } from './travel-map'

const BAND_SWATCHES: { key: keyof Dictionary['options']['detail']['difficultyBandLabels']; color: string }[] = [
  { key: 'easy', color: '#7c9070' },
  { key: 'moderate', color: '#c9a15a' },
  { key: 'hard', color: '#c1694f' },
  { key: 'blocked', color: '#8c3a3a' },
]

export function MapLegend({
  dict,
  visibility,
  onChange,
}: {
  dict: Dictionary
  visibility: LayerVisibility
  onChange: (next: LayerVisibility) => void
}) {
  const d = dict.compare.map

  function toggle(key: keyof LayerVisibility) {
    onChange({ ...visibility, [key]: !visibility[key] })
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4 text-sm">
      <div className="flex flex-wrap gap-1.5">
        {BAND_SWATCHES.map((b) => (
          <span key={b.key} className="flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-xs">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
            {dict.options.detail.difficultyBandLabels[b.key]}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        {(
          [
            ['bubbles', d.layerBubbles],
            ['surface', d.layerSurface],
            ['rings', d.layerRings],
            ['flows', d.layerFlows],
            ['markers', d.layerMarkers],
          ] as [keyof LayerVisibility, string][]
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2">
            <input type="checkbox" checked={visibility[key]} onChange={() => toggle(key)} className="accent-primary" />
            {label}
          </label>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{d.ringsCaveat}</p>
    </div>
  )
}
