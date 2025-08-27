'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslation } from 'react-i18next'
import '../../lib/i18n-config'

interface I18nProviderProps {
  children: React.ReactNode
}

export function I18nProvider({ children }: I18nProviderProps) {
  const { data: session } = useSession()
  const { i18n } = useTranslation()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Force i18next initialization on client side
    const initializeI18n = async () => {
      await import('../../lib/i18n-config')
      
      // Wait for i18next to be ready
      if (!i18n.isInitialized) {
        await new Promise((resolve) => {
          const checkReady = () => {
            if (i18n.isInitialized) {
              resolve(true)
            } else {
              setTimeout(checkReady, 50)
            }
          }
          checkReady()
        })
      }
      
      setIsReady(true)
    }
    
    initializeI18n()
  }, [i18n])

  useEffect(() => {
    // Load user's language preference from session
    if (session?.user?.language && i18n.language !== session.user.language && isReady) {
      i18n.changeLanguage(session.user.language).then(() => {
        // Store in localStorage to persist preference
        localStorage.setItem('i18nextLng', session.user.language)
      })
    }
  }, [session?.user?.language, i18n, isReady])

  // Show loading until i18n is ready
  if (!isReady) {
    return <div>Loading...</div>
  }

  return <>{children}</>
}