import type { Metadata } from 'next'
import { Playfair_Display, Manrope } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeScript } from '@/components/theme-script'

import './globals.css'

const bodyFont = Manrope({
  subsets: ['latin'],
  weight: ['400', '600'],
  variable: '--font-body',
  display: 'swap',
})

const displayFont = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'The Wedding Lab — Plan the wedding you’ll actually love',
  description:
    'Compare guest lists, venues, travel and cost side by side before you commit to a date — so the wedding you choose is the wedding you both want.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${bodyFont.variable} ${displayFont.variable}`}
      suppressHydrationWarning
    >
      <body className="h-full bg-background font-sans text-foreground">
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
