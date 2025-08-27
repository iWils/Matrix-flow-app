import { useTranslation } from 'react-i18next'
import { formatDate, formatDateTime, formatShortDate, formatTime } from '../utils'

export function useLocalizedDate() {
  const { i18n } = useTranslation()
  
  const currentLocale = i18n.language || 'fr'
  
  return {
    formatDate: (date: string | Date) => formatDate(date, currentLocale),
    formatDateTime: (date: string | Date) => formatDateTime(date, currentLocale),
    formatShortDate: (date: string | Date) => formatShortDate(date, currentLocale),
    formatTime: (date: string | Date) => formatTime(date, currentLocale)
  }
}