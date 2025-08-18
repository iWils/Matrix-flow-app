import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export default function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPaths = ['/login', '/api/auth']
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path))

  if (isPublicPath) {
    return NextResponse.next()
  }

  // Pour les routes API, laisser les endpoints gérer leur propre authentification
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
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
    
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}
 
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}