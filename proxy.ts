// proxy.ts — replaces the deprecated middleware.ts (renamed in Next.js 16.0)
// Handles:
//   1. Locale prefix routing: redirects /foo → /{locale}/foo
//   2. Auth guards: unauthenticated users → /{locale}/auth/login
//   3. Auth bounce: authenticated users → /{locale}/dashboard

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import { LOCALES, DEFAULT_LOCALE, hasLocale } from './lib/i18n'

// Routes that require authentication (without locale prefix).
const PROTECTED_PREFIXES = ['/dashboard', '/projects', '/settings', '/venues', '/enquiries', '/guests', '/plans', '/options', '/compare']

// Auth routes that authenticated users should be redirected away from.
const AUTH_PREFIXES = ['/auth/login', '/auth/signup', '/auth/reset-password']

// Public paths that don't require auth (without locale prefix).
const PUBLIC_PATHS = ['/']

// Paths that should never get the locale treatment (Next.js internals, API, static).
const BYPASS_PREFIXES = ['/_next', '/api', '/auth/callback', '/favicon.ico']

// ---------------------------------------------------------------------------
// getPreferredLocale — reads the locale from the cookie set on profile save;
// falls back to the Accept-Language header; then to the default.
// ---------------------------------------------------------------------------

function getPreferredLocale(request: NextRequest): string {
  // 1. Cookie (set by profile-save and login flows)
  const cookieLocale = request.cookies.get('wedding-locale')?.value
  if (cookieLocale && hasLocale(cookieLocale)) return cookieLocale

  // 2. Accept-Language header
  const acceptLang = request.headers.get('accept-language') ?? ''
  for (const segment of acceptLang.split(',')) {
    const tag = segment.split(';')[0].trim().toLowerCase()
    // Match full tag (e.g. 'de-DE') or language only (e.g. 'de')
    const lang = tag.split('-')[0]
    if (hasLocale(lang)) return lang
  }

  return DEFAULT_LOCALE
}

// ---------------------------------------------------------------------------
// stripLocalePrefix — removes the leading /{locale} segment if present,
// returning the bare path (always starts with /).
// ---------------------------------------------------------------------------

function stripLocalePrefix(pathname: string): string {
  for (const locale of LOCALES) {
    if (pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || '/'
    }
  }
  return pathname
}

// ---------------------------------------------------------------------------
// Proxy function (replaces middleware)
// ---------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Bypass internals, API routes, and static assets.
  if (BYPASS_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // 2. Detect whether the URL already has a locale prefix.
  const hasLocaleInPath = LOCALES.some(
    (locale) =>
      pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )

  // 3. If no locale prefix, redirect to the preferred locale.
  if (!hasLocaleInPath) {
    const locale = getPreferredLocale(request)
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
    return NextResponse.redirect(url)
  }

  // 4. We now have a locale-prefixed URL. Extract the bare path.
  const locale = LOCALES.find(
    (l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`),
  ) ?? DEFAULT_LOCALE
  const barePath = stripLocalePrefix(pathname) || '/'

  // 5. Supabase auth — must call getUser() so session cookies are refreshed.
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 6. Public marketing paths — always accessible.
  if (PUBLIC_PATHS.includes(barePath)) {
    return supabaseResponse
  }

  // 7. Protected routes — redirect unauthenticated users to login.
  const isProtected = PROTECTED_PREFIXES.some((p) => barePath.startsWith(p))
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/auth/login`
    return NextResponse.redirect(url)
  }

  // 8. Auth pages — redirect authenticated users to dashboard.
  const isAuthPage = AUTH_PREFIXES.some((p) => barePath.startsWith(p))
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}/dashboard`
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all paths except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
