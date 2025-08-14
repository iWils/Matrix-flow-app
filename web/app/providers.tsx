'use client'
import { SessionProvider } from 'next-auth/react'
import { LanguageProvider } from '../components/providers/LanguageProvider'
import { ThemeProvider } from '../components/providers/ThemeProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}
