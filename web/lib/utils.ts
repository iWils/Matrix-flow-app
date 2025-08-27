import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import 'dayjs/locale/es'

dayjs.extend(localizedFormat)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, locale: string = 'fr') {
  const localeMap: Record<string, string> = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es'
  }
  
  const dayjsLocale = localeMap[locale] || 'fr'
  return dayjs(date).locale(dayjsLocale).format('LL')
}

export function formatDateTime(date: string | Date, locale: string = 'fr') {
  const localeMap: Record<string, string> = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es'
  }
  
  const dayjsLocale = localeMap[locale] || 'fr'
  return dayjs(date).locale(dayjsLocale).format('LLL')
}

export function formatShortDate(date: string | Date, locale: string = 'fr') {
  const localeMap: Record<string, string> = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es'
  }
  
  const dayjsLocale = localeMap[locale] || 'fr'
  return dayjs(date).locale(dayjsLocale).format('L')
}

export function formatTime(date: string | Date, locale: string = 'fr') {
  const localeMap: Record<string, string> = {
    'fr': 'fr',
    'en': 'en',
    'es': 'es'
  }
  
  const dayjsLocale = localeMap[locale] || 'fr'
  return dayjs(date).locale(dayjsLocale).format('LT')
}
