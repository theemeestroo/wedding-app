'use client'

import { useServerInsertedHTML } from 'next/navigation'

const themeInitScript = `
  try {
    const t = localStorage.getItem('wedding-theme')
    if (t === 'dark') {
      document.documentElement.classList.add('dark')
    }
  } catch {}
`

export function ThemeScript() {
  useServerInsertedHTML(() => (
    <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
  ))
  return null
}
