'use client'

/**
 * The travel map (PRD §11) — five independently-toggleable layers over a
 * MapLibre GL canvas, driven entirely by data already computed server-side
 * or by lib/burden-surface-engine.ts / lib/contour-utils.ts client-side (see
 * those files' headers for why client-side is the right call here, same as
 * every other engine in this app).
 *
 * Plain maplibre-gl, not react-map-gl — five custom GeoJSON-driven layers
 * that all redraw together on every "active venue" toggle are more
 * predictable to manage with an imperative ref + useEffect than through a
 * declarative source/layer wrapper, and it's one fewer dependency.
 *
 * Layer colours are fixed hex constants, not this app's CSS custom
 * properties — MapLibre's bundled color parser doesn't understand the
 * oklch() colors app/globals.css uses, so silently reusing a theme token
 * here would just fail to parse. The palette below is chosen by eye to
 * match the app's rose/sage/paper theme, not wired to it mechanically.
 */

import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  computeBurdenGrid,
  computeCoverageRings,
  computePointBreakdown,
  type WeightedCluster,
  type CoverageRing,
} from '@/lib/burden-surface-engine'
import { computeBurdenContours } from '@/lib/contour-utils'
import type { OptionLogistics, DifficultyBand, Coordinates } from '@/lib/journey-engine'
import type { Dictionary } from '@/lib/i18n'
import type { Feature, FeatureCollection } from 'geojson'

const BAND_COLORS: Record<DifficultyBand, string> = {
  easy: '#7c9070',
  moderate: '#c9a15a',
  hard: '#c1694f',
  blocked: '#8c3a3a',
}

// Cool (low guest-hours) -> warm (high guest-hours), ivory-to-oxblood.
const CONTOUR_COLORS = ['#f6efe2', '#ecdcc0', '#dcb98d', '#c8905c', '#a8544a']

export interface VenueMarker {
  id: string
  name: string
  lat: number
  lng: number
}

export interface LayerVisibility {
  bubbles: boolean
  surface: boolean
  rings: boolean
  flows: boolean
  markers: boolean
}

export const DEFAULT_LAYER_VISIBILITY: LayerVisibility = {
  bubbles: true,
  surface: true,
  rings: true,
  flows: true,
  markers: true,
}

export interface DroppedPin {
  lat: number
  lng: number
  totalGuestHours: number
  bandCounts: Record<DifficultyBand, number>
}

// ---------------------------------------------------------------------------
// Geometry helpers — MapLibre doesn't curve lines or draw geographic circles
// itself, so both are built from real spherical geometry, not screen-space
// approximations.
// ---------------------------------------------------------------------------

function toRad(d: number) {
  return (d * Math.PI) / 180
}
function toDeg(r: number) {
  return (r * 180) / Math.PI
}

/** Great-circle interpolation (slerp) between two points — PRD §11.3's flow lines should curve like real travel, not a straight ruled line. */
function greatCircleArc(start: Coordinates, end: Coordinates, segments = 48): [number, number][] {
  const lat1 = toRad(start.lat)
  const lng1 = toRad(start.lng)
  const lat2 = toRad(end.lat)
  const lng2 = toRad(end.lng)
  const d =
    2 *
    Math.asin(
      Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lng2 - lng1) / 2) ** 2),
    )
  if (d === 0) return [[start.lng, start.lat], [end.lng, end.lat]]

  const points: [number, number][] = []
  for (let i = 0; i <= segments; i++) {
    const f = i / segments
    const A = Math.sin((1 - f) * d) / Math.sin(d)
    const B = Math.sin(f * d) / Math.sin(d)
    const x = A * Math.cos(lat1) * Math.cos(lng1) + B * Math.cos(lat2) * Math.cos(lng2)
    const y = A * Math.cos(lat1) * Math.sin(lng1) + B * Math.cos(lat2) * Math.sin(lng2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    points.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))])
  }
  return points
}

/** Points around a real geographic circle (destination-point-given-bearing formula) — used for the coverage rings. */
function circlePolygon(center: Coordinates, radiusKm: number, points = 72): [number, number][] {
  const distRad = radiusKm / 6371
  const lat1 = toRad(center.lat)
  const lng1 = toRad(center.lng)
  const coords: [number, number][] = []
  for (let i = 0; i <= points; i++) {
    const bearing = (i / points) * 2 * Math.PI
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distRad) + Math.cos(lat1) * Math.sin(distRad) * Math.cos(bearing))
    const lng2 =
      lng1 + Math.atan2(Math.sin(bearing) * Math.sin(distRad) * Math.cos(lat1), Math.cos(distRad) - Math.sin(lat1) * Math.sin(lat2))
    coords.push([toDeg(lng2), toDeg(lat2)])
  }
  return coords
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TravelMap({
  dict,
  activeVenue,
  otherVenues,
  logistics,
  weightedClusters,
  layerVisibility,
  onHoverCluster,
  onDropPin,
}: {
  dict: Dictionary
  activeVenue: VenueMarker
  otherVenues: VenueMarker[]
  logistics: OptionLogistics
  weightedClusters: WeightedCluster[]
  layerVisibility: LayerVisibility
  onHoverCluster?: (clusterId: string | null) => void
  onDropPin?: (pin: DroppedPin | null) => void
}) {
  const d = dict.compare.map
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const venueMarkersRef = useRef<maplibregl.Marker[]>([])
  const cogMarkerRef = useRef<maplibregl.Marker | null>(null)
  const gapLabelRef = useRef<maplibregl.Marker | null>(null)
  const pinMarkerRef = useRef<maplibregl.Marker | null>(null)
  const [ready, setReady] = useState(false)

  // Init the map exactly once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const key = process.env.NEXT_PUBLIC_MAPTILER_KEY
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/basic-v2/style.json?key=${key}`,
      center: [activeVenue.lng, activeVenue.lat],
      zoom: 3,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    mapRef.current = map

    map.on('load', () => setReady(true))
    // MapLibre reports invalid style/layer/paint expressions as an 'error'
    // event, not a thrown exception — surface it instead of failing silently.
    map.on('error', (e) => console.error('MapLibre error:', e.error))

    // The map view only mounts when the user switches to it (compare-board.tsx
    // renders this behind a conditional), so the container's final layout size
    // from the surrounding CSS grid isn't guaranteed to be settled at the
    // exact moment MapLibre reads container.clientWidth/Height to size its
    // WebGL canvas. A ResizeObserver keeps the canvas in sync with its
    // container's actual size from then on, including any later layout shift.
    const resizeObserver = new ResizeObserver(() => map.resize())
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Drop-a-pin — its own effect (not bundled into map init) so the handler
  // is re-registered with fresh closures whenever the underlying cluster
  // data or callback changes, rather than reaching for a ref workaround.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const handleClick = (e: maplibregl.MapMouseEvent) => {
      const breakdown = computePointBreakdown({ lat: e.lngLat.lat, lng: e.lngLat.lng }, weightedClusters)
      onDropPin?.({ lat: e.lngLat.lat, lng: e.lngLat.lng, ...breakdown })
    }
    map.on('click', handleClick)
    return () => {
      map.off('click', handleClick)
    }
  }, [ready, weightedClusters, onDropPin])

  // Rebuild layers whenever the active venue or its underlying data changes.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return

    onDropPin?.(null)
    pinMarkerRef.current?.remove()
    pinMarkerRef.current = null

    const centre = weightedCentreOfGravity(weightedClusters)
    const grid = computeBurdenGrid(weightedClusters)
    const rings = centre ? computeCoverageRings(weightedClusters, centre) : []

    upsertBubbles(map, logistics, weightedClusters)
    upsertSurface(map, grid)
    upsertRings(map, centre, rings)
    upsertFlowLines(map, logistics, weightedClusters, activeVenue)

    // Markers (DOM elements, managed outside MapLibre's own layer system).
    for (const m of venueMarkersRef.current) m.remove()
    venueMarkersRef.current = otherVenues
      .filter((v) => v.id !== activeVenue.id)
      .map((v) => new maplibregl.Marker({ color: '#8a8177' }).setLngLat([v.lng, v.lat]).setPopup(new maplibregl.Popup({ closeButton: false }).setText(v.name)).addTo(map))
    venueMarkersRef.current.push(
      new maplibregl.Marker({ color: '#8c3a3a' }).setLngLat([activeVenue.lng, activeVenue.lat]).setPopup(new maplibregl.Popup({ closeButton: false }).setText(activeVenue.name)).addTo(map),
    )

    cogMarkerRef.current?.remove()
    gapLabelRef.current?.remove()
    if (centre && grid) {
      const el = document.createElement('div')
      el.style.cssText = 'width:16px;height:16px;border:2px solid #4a4038;border-radius:9999px;background:transparent;'
      cogMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat([centre.lng, centre.lat]).addTo(map)

      const optimumGuestHours = grid.minValue
      const gapHours = Math.round(logistics.totalGuestHours - optimumGuestHours)
      if (gapHours > 0) {
        const midLng = (centre.lng + activeVenue.lng) / 2
        const midLat = (centre.lat + activeVenue.lat) / 2
        const labelEl = document.createElement('div')
        labelEl.className = 'rounded-md border bg-white/90 px-2 py-1 text-xs font-medium shadow-sm'
        labelEl.style.cssText += 'white-space:nowrap;color:#4a4038;border-color:#d8cdbb;'
        labelEl.textContent = `+${gapHours} ${d.guestHoursVsOptimum}`
        gapLabelRef.current = new maplibregl.Marker({ element: labelEl }).setLngLat([midLng, midLat]).addTo(map)

        upsertGapLine(map, centre, activeVenue)
      } else {
        removeGapLine(map)
      }
    }

    const bounds = new maplibregl.LngLatBounds()
    bounds.extend([activeVenue.lng, activeVenue.lat])
    for (const c of weightedClusters) bounds.extend([c.lng, c.lat])
    if (!bounds.isEmpty()) map.fitBounds(bounds, { padding: 60, maxZoom: 7, duration: 600 })

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, activeVenue.id, logistics, weightedClusters])

  // Layer visibility toggles.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    setVisibility(map, 'cluster-bubbles', layerVisibility.bubbles)
    setVisibility(map, 'burden-surface-fill', layerVisibility.surface)
    setVisibility(map, 'coverage-rings-line', layerVisibility.rings)
    setVisibility(map, 'flow-lines', layerVisibility.flows)
    for (const m of venueMarkersRef.current) m.getElement().style.display = layerVisibility.markers ? '' : 'none'
    if (cogMarkerRef.current) cogMarkerRef.current.getElement().style.display = layerVisibility.markers ? '' : 'none'
    if (gapLabelRef.current) gapLabelRef.current.getElement().style.display = layerVisibility.markers ? '' : 'none'
  }, [ready, layerVisibility])

  // Hover tooltip for cluster bubbles — PRD §11.4: "who's in it, the route,
  // door-to-door time, cost per person, and any flags".
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    const layerId = 'cluster-bubbles'
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12 })

    const handleEnter = (e: maplibregl.MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = 'pointer'
      const feature = e.features?.[0]
      if (!feature) return
      const clusterId = feature.properties?.clusterId as string
      onHoverCluster?.(clusterId)

      const cluster = logistics.clusters.find((c) => c.clusterId === clusterId)
      const journey = cluster?.journey
      const bandLabel = journey ? dict.options.detail.difficultyBandLabels[journey.difficultyBand] : ''
      const hours = journey ? (journey.doorToDoorHours < 1 ? `${Math.round(journey.doorToDoorHours * 60)}m` : `${journey.doorToDoorHours.toFixed(1)}h`) : d.noRouteYet
      const cost = journey ? new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(journey.costPerPerson) : ''

      const html = `
        <div style="font-family:inherit;min-width:160px">
          <div style="font-weight:600;margin-bottom:2px">${cluster?.label ?? ''}</div>
          <div style="font-size:12px;color:#6b6255">${cluster?.guestCount ?? 0} ${d.guestsUnit} · ${bandLabel}</div>
          ${journey ? `<div style="font-size:12px;color:#6b6255">${hours} · ${cost} ${d.perPersonUnit}</div>` : ''}
        </div>
      `
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map)
    }
    const handleLeave = () => {
      map.getCanvas().style.cursor = ''
      onHoverCluster?.(null)
      popup.remove()
    }
    map.on('mouseenter', layerId, handleEnter)
    map.on('mouseleave', layerId, handleLeave)
    return () => {
      map.off('mouseenter', layerId, handleEnter)
      map.off('mouseleave', layerId, handleLeave)
      popup.remove()
    }
  }, [ready, onHoverCluster, logistics, dict, d])

  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Layer builders — each upserts its own source + layer(s), safe to call
// repeatedly (MapLibre's setData()/addLayer() guard against re-adding).
// ---------------------------------------------------------------------------

function weightedCentreOfGravity(clusters: WeightedCluster[]): Coordinates | null {
  const total = clusters.reduce((s, c) => s + c.guestCount, 0)
  if (total === 0) return null
  return {
    lat: clusters.reduce((s, c) => s + c.lat * c.guestCount, 0) / total,
    lng: clusters.reduce((s, c) => s + c.lng * c.guestCount, 0) / total,
  }
}

function ensureSource(map: maplibregl.Map, id: string, data: FeatureCollection) {
  const existing = map.getSource(id) as maplibregl.GeoJSONSource | undefined
  if (existing) {
    existing.setData(data)
  } else {
    map.addSource(id, { type: 'geojson', data })
  }
}

function setVisibility(map: maplibregl.Map, layerId: string, visible: boolean) {
  if (!map.getLayer(layerId)) return
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none')
}

function upsertBubbles(map: maplibregl.Map, logistics: OptionLogistics, clusters: WeightedCluster[]) {
  const coordsById = new Map(clusters.map((c) => [c.id, c]))
  const features: Feature[] = logistics.clusters
    .map((c): Feature | null => {
      const coords = coordsById.get(c.clusterId)
      if (!coords) return null
      return {
        type: 'Feature' as const,
        properties: {
          clusterId: c.clusterId,
          label: c.label,
          guestCount: c.guestCount,
          band: c.journey?.difficultyBand ?? 'moderate',
        },
        geometry: { type: 'Point' as const, coordinates: [coords.lng, coords.lat] },
      }
    })
    .filter((f): f is Feature => f !== null)

  ensureSource(map, 'clusters', { type: 'FeatureCollection', features })

  if (!map.getLayer('cluster-bubbles')) {
    map.addLayer({
      id: 'cluster-bubbles',
      type: 'circle',
      source: 'clusters',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'guestCount']], 0, 4, 10, 30],
        'circle-color': [
          'match',
          ['get', 'band'],
          'easy', BAND_COLORS.easy,
          'moderate', BAND_COLORS.moderate,
          'hard', BAND_COLORS.hard,
          'blocked', BAND_COLORS.blocked,
          BAND_COLORS.moderate,
        ],
        'circle-opacity': 0.85,
        'circle-stroke-width': 1.5,
        'circle-stroke-color': '#ffffff',
      },
    })
  }
}

function upsertSurface(map: maplibregl.Map, grid: ReturnType<typeof computeBurdenGrid>) {
  const contours = grid ? computeBurdenContours(grid) : { type: 'FeatureCollection' as const, features: [] }
  ensureSource(map, 'burden-surface', contours)

  if (!map.getLayer('burden-surface-fill')) {
    map.addLayer(
      {
        id: 'burden-surface-fill',
        type: 'fill',
        source: 'burden-surface',
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'value'],
            grid?.minValue ?? 0, CONTOUR_COLORS[0],
            grid?.maxValue ?? 1, CONTOUR_COLORS[CONTOUR_COLORS.length - 1],
          ],
          'fill-opacity': 0.45,
        },
      },
      'cluster-bubbles',
    )
  } else if (grid) {
    map.setPaintProperty('burden-surface-fill', 'fill-color', [
      'interpolate',
      ['linear'],
      ['get', 'value'],
      grid.minValue, CONTOUR_COLORS[0],
      grid.maxValue, CONTOUR_COLORS[CONTOUR_COLORS.length - 1],
    ])
  }
}

function upsertRings(map: maplibregl.Map, centre: Coordinates | null, rings: CoverageRing[]) {
  const features: Feature[] =
    centre && rings.length > 0
      ? rings
          .filter((r) => r.radiusKm > 0)
          .map((r) => ({
            type: 'Feature' as const,
            properties: { thresholdHours: r.thresholdHours, coveragePercent: Math.round(r.coveragePercent) },
            geometry: { type: 'LineString' as const, coordinates: circlePolygon(centre, r.radiusKm) },
          }))
      : []

  ensureSource(map, 'coverage-rings', { type: 'FeatureCollection', features })

  if (!map.getLayer('coverage-rings-line')) {
    map.addLayer({
      id: 'coverage-rings-line',
      type: 'line',
      source: 'coverage-rings',
      paint: {
        'line-color': '#4a4038',
        'line-width': 1.5,
        'line-dasharray': [2, 2],
        'line-opacity': 0.6,
      },
    })
  }
}

function upsertFlowLines(
  map: maplibregl.Map,
  logistics: OptionLogistics,
  clusters: WeightedCluster[],
  activeVenue: VenueMarker,
) {
  const coordsById = new Map(clusters.map((c) => [c.id, c]))

  const lineFeatures: Feature[] = logistics.clusters
    .filter((c) => c.journey !== null)
    .map((c): Feature | null => {
      const origin = coordsById.get(c.clusterId)
      if (!origin) return null
      const arc = greatCircleArc({ lat: origin.lat, lng: origin.lng }, { lat: activeVenue.lat, lng: activeVenue.lng })
      return {
        type: 'Feature' as const,
        properties: { band: c.journey!.difficultyBand, guestCount: c.guestCount },
        geometry: { type: 'LineString' as const, coordinates: arc },
      }
    })
    .filter((f): f is Feature => f !== null)

  ensureSource(map, 'flow-lines', { type: 'FeatureCollection', features: lineFeatures })

  if (!map.getLayer('flow-lines')) {
    map.addLayer(
      {
        id: 'flow-lines',
        type: 'line',
        source: 'flow-lines',
        paint: {
          'line-color': [
            'match',
            ['get', 'band'],
            'easy', BAND_COLORS.easy,
            'moderate', BAND_COLORS.moderate,
            'hard', BAND_COLORS.hard,
            'blocked', BAND_COLORS.blocked,
            BAND_COLORS.moderate,
          ],
          'line-width': ['interpolate', ['linear'], ['sqrt', ['get', 'guestCount']], 0, 1, 8, 5],
          'line-opacity': 0.7,
          'line-dasharray': ['case', ['in', ['get', 'band'], ['literal', ['hard', 'blocked']]], ['literal', [1, 1]], ['literal', [1, 0]]],
        },
      },
      'cluster-bubbles',
    )
  }
}

function upsertGapLine(map: maplibregl.Map, centre: Coordinates, activeVenue: VenueMarker) {
  const data: FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: [[centre.lng, centre.lat], [activeVenue.lng, activeVenue.lat]] },
      },
    ],
  }
  ensureSource(map, 'gap-line', data)
  if (!map.getLayer('gap-line')) {
    map.addLayer({
      id: 'gap-line',
      type: 'line',
      source: 'gap-line',
      paint: { 'line-color': '#4a4038', 'line-width': 1, 'line-dasharray': [1, 1.5], 'line-opacity': 0.7 },
    })
  }
}

function removeGapLine(map: maplibregl.Map) {
  if (map.getLayer('gap-line')) map.removeLayer('gap-line')
  if (map.getSource('gap-line')) map.removeSource('gap-line')
}
