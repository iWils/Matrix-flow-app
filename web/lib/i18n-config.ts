import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translations directly
import enCommon from '../public/locales/en/common.json'
import frCommon from '../public/locales/fr/common.json'
import esCommon from '../public/locales/es/common.json'
import enLogin from '../public/locales/en/login.json'
import frLogin from '../public/locales/fr/login.json'
import esLogin from '../public/locales/es/login.json'
import enDashboard from '../public/locales/en/dashboard.json'
import frDashboard from '../public/locales/fr/dashboard.json'
import esDashboard from '../public/locales/es/dashboard.json'
import enAdmin from '../public/locales/en/admin.json'
import frAdmin from '../public/locales/fr/admin.json'
import esAdmin from '../public/locales/es/admin.json'
import enWorkflow from '../public/locales/en/workflow.json'
import frWorkflow from '../public/locales/fr/workflow.json'
import esWorkflow from '../public/locales/es/workflow.json'
import enMatrices from '../public/locales/en/matrices.json'
import frMatrices from '../public/locales/fr/matrices.json'
import esMatrices from '../public/locales/es/matrices.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'fr',
    fallbackLng: 'fr',
    debug: process.env.NODE_ENV === 'development',
    
    // Resources embedded directly
    resources: {
      en: {
        common: enCommon,
        login: enLogin,
        dashboard: enDashboard,
        admin: enAdmin,
        workflow: enWorkflow,
        matrices: enMatrices
      },
      fr: {
        common: frCommon,
        login: frLogin,
        dashboard: frDashboard,
        admin: frAdmin,
        workflow: frWorkflow,
        matrices: frMatrices
      },
      es: {
        common: esCommon,
        login: esLogin,
        dashboard: esDashboard,
        admin: esAdmin,
        workflow: esWorkflow,
        matrices: esMatrices
      }
    },
    
    // Namespace configuration
    ns: ['common', 'dashboard', 'admin', 'workflow', 'matrices', 'login'],
    defaultNS: 'common',
    
    // Load login namespace by default for unauthenticated pages
    load: 'languageOnly',
    
    // Language detection
    detection: {
      order: ['localStorage', 'cookie', 'querystring', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      lookupQuerystring: 'lng',
      excludeCacheFor: ['cimode'],
    },
    
    // React integration
    react: {
      useSuspense: false,
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i']
    },
    
    // Interpolation options
    interpolation: {
      escapeValue: false,
    }
  })

export default i18n