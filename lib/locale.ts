/**
 * locale.ts — shared locale utilities with no React/client dependencies.
 *
 * Safe to import from both server components and client components.
 */

/**
 * Builds a locale-prefixed path string.
 *
 * Usage (server component):
 *   localizePath(lang, '/dashboard')  →  '/en/dashboard'
 */
export function localizePath(lang: string, path: string): string {
  return `/${lang}${path}`
}
