'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggle: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialise from the class the inline script already applied so there's no
  // flash: if the html element has .dark we start dark, otherwise light.
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const initial = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light'
    setTheme(initial)
  }, [])

  function toggle() {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      const root = document.documentElement
      if (next === 'dark') {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
      try {
        localStorage.setItem('wedding-theme', next)
      } catch {}
      return next
    })
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
