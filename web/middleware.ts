import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
// Conditional import to avoid Edge Runtime issues
async function getRateLimitFunctions() {
  if (process.env.NEXT_RUNTIME === 'edge') {
    // Return no-op functions for Edge Runtime
    return {
      authRateLimit: async () => null,
      loginRateLimit: async () => null,
      apiRateLimit: async () => null,
      globalRateLimit: async () => null
    }
  }
  
  const { authRateLimit, loginRateLimit, apiRateLimit, globalRateLimit } = await import('./middleware/rateLimit')
  return { authRateLimit, loginRateLimit, apiRateLimit, globalRateLimit }
}
import { 
  applySecurityHeaders, 
  shouldApplySecurityHeaders 
} from './lib/security/headers'

export default async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Helper pour appliquer les headers de sécurité à toute réponse
  const applySecurityIfNeeded = (response: NextResponse): NextResponse => {
    if (shouldApplySecurityHeaders(request)) {
      return applySecurityHeaders(response, request)
    }
    return response
  }

  // Get rate limit functions (conditional for Edge Runtime)
  const { authRateLimit, loginRateLimit, apiRateLimit, globalRateLimit } = await getRateLimitFunctions()

  // Appliquer le rate limiting global en premier
  const globalRateLimitResponse = await globalRateLimit(request)
  if (globalRateLimitResponse && globalRateLimitResponse.status === 429) {
    return applySecurityIfNeeded(globalRateLimitResponse)
  }

  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPaths = ['/login', '/api/auth']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  // Rate limiting spécialisé pour les endpoints d'authentification
  if (pathname.startsWith('/api/auth/login') || pathname === '/login') {
    const loginRateLimitResponse = await loginRateLimit(request)
    if (loginRateLimitResponse && loginRateLimitResponse.status === 429) {
      return applySecurityIfNeeded(loginRateLimitResponse)
    }
  } else if (pathname.startsWith('/api/auth')) {
    const authRateLimitResponse = await authRateLimit(request)
    if (authRateLimitResponse && authRateLimitResponse.status === 429) {
      return applySecurityIfNeeded(authRateLimitResponse)
    }
  }

  if (isPublicPath) {
    const response = NextResponse.next()
    return applySecurityIfNeeded(response)
  }

  // Pour les routes API, appliquer le rate limiting API
  if (pathname.startsWith('/api/')) {
    const apiRateLimitResponse = await apiRateLimit(request)
    if (apiRateLimitResponse && apiRateLimitResponse.status === 429) {
      return applySecurityIfNeeded(apiRateLimitResponse)
    }
    const response = NextResponse.next()
    return applySecurityIfNeeded(response)
  }

  // Vérifier la présence du token de session uniquement pour les pages web
  const sessionToken = request.cookies.get('authjs.session-token') ||
                      request.cookies.get('__Secure-authjs.session-token')

  if (!sessionToken) {
    // Créer l'URL de redirection en préservant le pathname et les paramètres
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    
    // Stocker l'URL complète demandée comme callback
    const callbackUrl = pathname + search
    loginUrl.searchParams.set('callbackUrl', callbackUrl)
    
    const redirectResponse = NextResponse.redirect(loginUrl)
    return applySecurityIfNeeded(redirectResponse)
  }

  // Créer la réponse finale
  const response = NextResponse.next()
  return applySecurityIfNeeded(response)
}
 
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}