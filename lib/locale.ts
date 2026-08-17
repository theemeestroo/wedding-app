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

/**
 * Fills {{token}} placeholders in a dictionary string, matching the
 * convention already used in messages/*.json (e.g. common.pagination.pageOf).
 *
 * Usage: interpolate(dict.foo.bar, { name: 'Jane' })
 */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''))
}
