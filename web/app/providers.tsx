'use client'
import { SessionProvider } from 'next-auth/react'
import { I18nProvider } from '../components/providers/I18nProvider'
import { ThemeProvider } from '../components/providers/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <I18nProvider>
          {children}
        </I18nProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
