import type { Metadata } from 'next'
import { Cormorant_Garamond, Inter, Parisienne } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeScript } from '@/components/theme-script'

import './globals.css'

const bodyFont = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

// Signature script — used sparingly, for the odd hand-lettered flourish
// (an "&", a closing note), never for anything that needs to be scanned.
const scriptFont = Parisienne({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-script-raw',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Aisle — Plan the wedding you’ll actually love',
  description:
    'Compare guest lists, venues, travel and cost side by side before you commit to a date — so the wedding you choose is the wedding you both want.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${bodyFont.variable} ${displayFont.variable} ${scriptFont.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background font-sans text-foreground">
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
