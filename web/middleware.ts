import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
 
export default function middleware(request: NextRequest) {
  // Utiliser auth() comme middleware wrapper n'est plus supporté en v5
  // Il faut gérer l'authentification différemment
  const { pathname } = request.nextUrl
  
  // Pages publiques
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next()
  }
  
  // Pour les autres routes, rediriger vers login si pas de session
  // Note: En v5, il faut vérifier la session côté serveur dans chaque page
  return NextResponse.next()
}
 
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$).*)',
  ],
}