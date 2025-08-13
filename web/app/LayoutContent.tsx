'use client'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  
  // Pages qui ne doivent pas avoir la sidebar
  const isAuthPage = pathname === '/login' || pathname.startsWith('/api/auth/')
  
  // Toujours afficher le contenu, même pendant le chargement
  if (isAuthPage) {
    return <div className="min-h-screen bg-slate-50">{children}</div>
  }
  
  // Si pas encore chargé ou pas authentifié, afficher sans sidebar
  if (status === 'loading' || !session) {
    return <div className="min-h-screen bg-slate-50">{children}</div>
  }
  
  // Utilisateur authentifié, afficher avec sidebar
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr] bg-slate-50">
      <aside className="bg-slate-900 text-white p-4">
        <div className="font-bold mb-6">Matrix Flow</div>
        <nav className="space-y-2">
          <Nav href="/">Tableau de bord</Nav>
          <Nav href="/matrices">Matrices</Nav>
          <Nav href="/users">Utilisateurs</Nav>
        </nav>
        
        {/* User info and logout */}
        <div className="mt-auto pt-6 border-t border-slate-700">
          <div className="text-sm text-slate-300 mb-2">
            {session.user?.name || session.user?.email}
          </div>
          <button
            onClick={() => {
              // Import dynamique pour éviter les erreurs SSR
              import('next-auth/react').then(({ signOut }) => signOut())
            }}
            className="text-sm text-slate-400 hover:text-white"
          >
            Déconnexion
          </button>
        </div>
      </aside>
      <main className="p-6">{children}</main>
    </div>
  )
}

function Nav({ href, children }: { href: string, children: any }) {
  return (
    <Link href={href} className="block py-2 px-3 rounded hover:bg-slate-800/30">
      {children}
    </Link>
  )
}