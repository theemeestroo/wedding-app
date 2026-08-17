import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeScript } from '@/components/theme-script'

import './globals.css'

export const metadata: Metadata = {
  title: 'Wedding Decision Platform',
  description: 'Figure out the right wedding before you start organising it.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="h-full bg-background font-sans text-foreground">
        <ThemeScript />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
