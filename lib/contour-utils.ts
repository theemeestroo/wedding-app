/**
 * Wraps d3-contour to turn a lib/burden-surface-engine.ts grid into real
 * lat/lng GeoJSON — d3-contour outputs grid-cell coordinates (⟨i+0.5,j+0.5⟩
 * per element i+j×cols, per its own docs), not geographic ones, so this
 * applies the linear transform back using the grid's own bounding box.
 *
 * Thresholds are chosen as evenly-spaced quantiles of the grid's own value
 * range, not fixed absolute guest-hour numbers — a project with 20 guests
 * in one country and one with 150 across four continents have wildly
 * different guest-hour scales, and quantiles keep the heat bands meaningful
 * for both.
 */

import { contours as d3contours } from 'd3-contour'
import type { Feature, FeatureCollection, MultiPolygon } from 'geojson'
import type { BurdenGridResult } from './burden-surface-engine'

export interface BurdenContourFeature extends Feature<MultiPolygon> {
  properties: { value: number }
}

export function computeBurdenContours(grid: BurdenGridResult, bandCount = 5): FeatureCollection<MultiPolygon> {
  const { values, cols, rows, bounds, minValue, maxValue } = grid

  if (!(maxValue > minValue)) {
    return { type: 'FeatureCollection', features: [] }
  }

  const thresholds: number[] = []
  for (let i = 1; i < bandCount; i++) {
    thresholds.push(minValue + (i / bandCount) * (maxValue - minValue))
  }

  const generator = d3contours().size([cols, rows]).thresholds(thresholds)
  const rawContours = generator(values)

  const lngFor = (x: number) => bounds.minLng + (x / cols) * (bounds.maxLng - bounds.minLng)
  const latFor = (y: number) => bounds.minLat + (y / rows) * (bounds.maxLat - bounds.minLat)

  const features: BurdenContourFeature[] = rawContours.map((c) => ({
    type: 'Feature',
    properties: { value: c.value },
    geometry: {
      type: 'MultiPolygon',
      coordinates: c.coordinates.map((polygon) =>
        polygon.map((ring) => ring.map(([x, y]) => [lngFor(x), latFor(y)] as [number, number])),
      ),
    },
  }))

  return { type: 'FeatureCollection', features }
}
