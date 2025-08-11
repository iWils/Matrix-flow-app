import { auth } from "@/auth"
import { NextResponse } from "next/server"
 
export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth
  
  // Pages publiques
  const isPublicPage = nextUrl.pathname === '/login'
  
  // API routes publiques
  const isPublicApi = nextUrl.pathname.startsWith('/api/auth/')
  
  // Rediriger vers login si non connecté
  if (!isLoggedIn && !isPublicPage && !isPublicApi) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }
  
  // Rediriger vers dashboard si connecté et sur login
  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }
  
  return NextResponse.next()
})
 
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}