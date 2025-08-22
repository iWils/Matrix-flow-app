import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import HttpBackend from 'i18next-http-backend'
import LanguageDetector from 'i18next-browser-languagedetector'

const isServer = typeof window === 'undefined'

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'en',
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // Namespace configuration
    ns: ['common', 'dashboard', 'admin'],
    defaultNS: 'common',
    
    // Backend configuration
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    
    // Language detection
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      lookupQuerystring: 'lng',
    },
    
    // React integration
    react: {
      useSuspense: false,
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false,
    },
    
    // Load languages
    preload: isServer ? ['en', 'fr', 'es'] : [],
    
    // Support for legacy keys
    compatibilityJSON: 'v4',
  })

export default i18n