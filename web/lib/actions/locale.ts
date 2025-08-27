'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export async function changeLocale(locale: string) {
  const cookieStore = await cookies()
  
  // Validate locale
  if (!['en', 'fr', 'es'].includes(locale)) {
    throw new Error('Invalid locale')
  }
  
  // Set the locale cookie
  cookieStore.set('locale', locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https'),
    sameSite: 'lax',
    path: '/'
  })
  
  // Also set the i18nextLng cookie for compatibility
  cookieStore.set('i18nextLng', locale, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production' && process.env.NEXTAUTH_URL?.startsWith('https'),
    sameSite: 'lax',
    path: '/'
  })
  
  // Revalidate the login path to refresh with new locale
  revalidatePath('/login')
  
  return { success: true, locale }
}