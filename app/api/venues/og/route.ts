// Server-side Open Graph capture for the "add venue by URL" flow (PRD §14 —
// cheap and reliable compared to scraping listing sites, which Airbnb and
// Booking.com both block and prohibit). Some platforms still block
// server-side fetches entirely; callers should treat a non-ok response as
// "fall back to manual entry", not an error.

const PRIVATE_HOSTNAME_RE =
  /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|::1$|fc00:|fe80:)/i

function extractMetaTag(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, 'i'),
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match) return match[1]
  }
  return null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url')
  if (!rawUrl) {
    return Response.json({ ok: false, reason: 'missing_url' }, { status: 400 })
  }

  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return Response.json({ ok: false, reason: 'invalid_url' })
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    return Response.json({ ok: false, reason: 'invalid_url' })
  }
  if (PRIVATE_HOSTNAME_RE.test(target.hostname)) {
    return Response.json({ ok: false, reason: 'invalid_url' })
  }

  try {
    const res = await fetch(target.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; WeddingDecisionPlatform/0.1; +https://github.com/theemeestroo/wedding-app)',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      return Response.json({ ok: false, reason: 'fetch_failed' })
    }

    const contentType = res.headers.get('content-type') ?? ''
    if (!contentType.includes('text/html')) {
      return Response.json({ ok: false, reason: 'not_html' })
    }

    const html = await res.text()

    return Response.json({
      ok: true,
      title: extractMetaTag(html, 'og:title'),
      image: extractMetaTag(html, 'og:image'),
      description: extractMetaTag(html, 'og:description'),
      platform: target.hostname.replace(/^www\./, ''),
    })
  } catch {
    return Response.json({ ok: false, reason: 'fetch_failed' })
  }
}
