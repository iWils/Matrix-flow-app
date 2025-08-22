'use client'
import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import '../../lib/i18n-config'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { data: session } = useSession()
  const { i18n } = useTranslation()

  useEffect(() => {
    // Force i18next initialization on client side
    import('../../lib/i18n-config')
  }, [])

  useEffect(() => {
    // Load user's language preference from session
    if (session?.user?.language && i18n.language !== session.user.language) {
      i18n.changeLanguage(session.user.language)
    }
  }, [session?.user?.language, i18n])

  return <>{children}</>
}