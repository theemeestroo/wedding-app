'use client'

import { createContext, useContext } from 'react'
import { useParams, useRouter } from 'next/navigation'
import type { Dictionary } from './i18n'

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const I18nContext = createContext<Dictionary | null>(null)

export function I18nProvider({
  dict,
  children,
}: {
  dict: Dictionary
  children: React.ReactNode
}) {
  return <I18nContext.Provider value={dict}>{children}</I18nContext.Provider>
}

// ---------------------------------------------------------------------------
// useTranslations — returns the full dictionary for the current locale.
// Must be used within an I18nProvider.
// ---------------------------------------------------------------------------

export function useTranslations(): Dictionary {
  const dict = useContext(I18nContext)
  if (!dict) throw new Error('useTranslations must be called inside I18nProvider')
  return dict
}

// ---------------------------------------------------------------------------
// useLocale — returns the current locale string from the [lang] route param.
// ---------------------------------------------------------------------------

export function useLocale(): string {
  const params = useParams()
  return (params?.lang as string) ?? 'en'
}

// ---------------------------------------------------------------------------
// useLocalizedRouter — wraps Next.js router to auto-prefix all paths with
// the current locale. Use this instead of useRouter() in client components
// that need programmatic navigation.
//
// Usage:
//   const router = useLocalizedRouter()
//   router.push('/dashboard')          → navigates to /en/dashboard
//   router.back()                      → normal back navigation
//   router.refresh()                   → normal refresh
// ---------------------------------------------------------------------------

export function useLocalizedRouter() {
  const router = useRouter()
  const lang = useLocale()

  return {
    push(path: string) {
      router.push(`/${lang}${path}`)
    },
    replace(path: string) {
      router.replace(`/${lang}${path}`)
    },
    back() {
      router.back()
    },
    refresh() {
      router.refresh()
    },
  }
}

// ---------------------------------------------------------------------------
// localizePath — re-exported from lib/locale.ts for client-component imports.
// Server components must import directly from '@/lib/locale' instead.
// ---------------------------------------------------------------------------

export { localizePath } from './locale'
