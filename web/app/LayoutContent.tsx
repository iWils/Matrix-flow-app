'use client'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Pages qui ne doivent pas avoir la sidebar
  const isAuthPage = pathname === '/login' || pathname.startsWith('/api/auth/')
  
  // Toujours afficher le contenu, même pendant le chargement
  if (isAuthPage) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">{children}</div>
  }
  
  // Si pas encore chargé ou pas authentifié, afficher sans sidebar
  if (status === 'loading' || !session) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">{children}</div>
  }

  const navigationItems = [
    {
      href: '/',
      label: 'Tableau de bord',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      href: '/matrices',
      label: 'Matrices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      href: '/users',
      label: 'Utilisateurs',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    }
  ]
  
  // Utilisateur authentifié, afficher avec sidebar
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Toujours fixe */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200/50 shadow-xl
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200/50">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.svg"
                alt="Matrix Flow Logo"
                width={32}
                height={32}
                className="drop-shadow-md"
                priority
              />
              <div>
                <div className="font-bold text-slate-900">Matrix Flow</div>
                <div className="text-xs text-slate-500">Gestion des flux</div>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                isActive={pathname === item.href}
                onClick={() => setSidebarOpen(false)}
              >
                {item.label}
              </NavItem>
            ))}
          </nav>
          
          {/* User info and logout */}
          <div className="p-4 border-t border-slate-200/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-400 to-slate-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {(session.user?.name || session.user?.email || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-900 truncate">
                  {session.user?.name || session.user?.email}
                </div>
                <div className="text-xs text-slate-500 capitalize">
                  {session.user?.role || 'utilisateur'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                import('next-auth/react').then(({ signOut }) => signOut())
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      </aside>
      
      {/* Main content - Avec marge pour la sidebar fixe */}
      <div className="flex-1 lg:ml-64 w-full">
        {/* Header fixe pour desktop et mobile */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Bouton menu mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Logo mobile uniquement */}
            <div className="lg:hidden flex items-center gap-2">
              <Image
                src="/logo.svg"
                alt="Matrix Flow Logo"
                width={24}
                height={24}
                className="drop-shadow-sm"
              />
              <span className="font-semibold text-slate-900">Matrix Flow</span>
            </div>
            
            {/* Titre de page ou breadcrumb pour desktop */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-semibold text-slate-900">
                {pathname === '/' && 'Tableau de bord'}
                {pathname === '/matrices' && 'Gestion des Matrices'}
                {pathname === '/users' && 'Gestion des Utilisateurs'}
                {pathname.startsWith('/matrices/') && 'Détails de la Matrice'}
              </h2>
            </div>
            
            {/* Espace ou actions supplémentaires */}
            <div className="lg:flex items-center gap-4 hidden">
              {/* Vous pouvez ajouter des notifications, profil rapide, etc. ici */}
              <div className="text-sm text-slate-500">
                {session.user?.name || session.user?.email}
              </div>
            </div>
            
            {/* Spacer pour mobile */}
            <div className="lg:hidden w-10" />
          </div>
        </header>
        
        {/* Contenu principal avec padding */}
        <main className="p-6 min-h-[calc(100vh-73px)]">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavItem({
  href,
  children,
  icon,
  isActive,
  onClick
}: {
  href: string
  children: React.ReactNode
  icon: React.ReactNode
  isActive: boolean
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
        ${isActive
          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }
      `}
    >
      <span className={isActive ? 'text-white' : 'text-slate-400'}>{icon}</span>
      {children}
    </Link>
  )
}