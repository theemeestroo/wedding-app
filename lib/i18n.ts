import 'server-only'

export const LOCALES = ['en', 'de', 'fr'] as const
export type Locale = (typeof LOCALES)[number]
export const DEFAULT_LOCALE: Locale = 'en'

export function hasLocale(locale: string): locale is Locale {
  return (LOCALES as readonly string[]).includes(locale)
}

// ---------------------------------------------------------------------------
// getDictionary — loads the JSON translation file for the given locale.
// Only runs on the server (import 'server-only' above).
// ---------------------------------------------------------------------------

const dictionaries = {
  en: () => import('../messages/en.json').then((m) => m.default),
  de: () => import('../messages/de.json').then((m) => m.default),
  fr: () => import('../messages/fr.json').then((m) => m.default),
}

export type Dictionary = Awaited<ReturnType<typeof dictionaries.en>>

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale]()
}
