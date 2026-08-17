import { createAdminClient } from '@/lib/supabase/admin'

// Nominatim (OSM) per PRD §10.6 — free, no API key, v1's honest choice over
// a paid geocoder. Usage policy caps at 1 req/sec and requires a real
// User-Agent; callers are responsible for spacing out requests (the CSV
// import flow does this sequentially). The cache is global (not
// project-scoped, see the Phase 3 migration) so repeat cities across every
// project on this app cost nothing after the first lookup.

function normalizeQuery(city: string, country: string): string {
  return `${city.trim().toLowerCase()}, ${country.trim().toLowerCase()}`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get('city')?.trim()
  const country = searchParams.get('country')?.trim()

  if (!city || !country) {
    return Response.json({ ok: false, reason: 'missing_city_or_country' }, { status: 400 })
  }

  const admin = createAdminClient()
  const query = normalizeQuery(city, country)

  const { data: cached } = await admin
    .from('geocode_cache')
    .select('latitude, longitude')
    .eq('query', query)
    .maybeSingle()

  if (cached) {
    return Response.json({ ok: true, latitude: cached.latitude, longitude: cached.longitude, cached: true })
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(`${city}, ${country}`)}`
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WeddingDecisionPlatform/0.1 (+https://github.com/theemeestroo/wedding-app)',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return Response.json({ ok: false, reason: 'geocode_failed' })
    }

    const results = (await res.json()) as Array<{ lat: string; lon: string }>
    if (results.length === 0) {
      return Response.json({ ok: false, reason: 'not_found' })
    }

    const latitude = Number(results[0].lat)
    const longitude = Number(results[0].lon)

    await admin.from('geocode_cache').insert({ query, latitude, longitude })

    return Response.json({ ok: true, latitude, longitude, cached: false })
  } catch {
    return Response.json({ ok: false, reason: 'geocode_failed' })
  }
}
