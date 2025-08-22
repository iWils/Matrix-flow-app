'use client'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import { UserMenu } from '../components/ui/UserMenu'
import { ChangePasswordModal } from '../components/ui/ChangePasswordModal'
import { ChangeNameModal } from '../components/ui/ChangeNameModal'
import { LanguageModal } from '../components/ui/LanguageModal'
import { ThemeToggle } from '../components/ui/ThemeToggle'
import { useTranslation } from 'react-i18next'

export function LayoutContent({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false)
  const [changeNameModalOpen, setChangeNameModalOpen] = useState(false)
  const [languageModalOpen, setLanguageModalOpen] = useState(false)
  const { t } = useTranslation(['dashboard', 'common'])
  
  // Pages qui ne doivent pas avoir la sidebar
  const isAuthPage = pathname === '/login' || pathname.startsWith('/api/auth/')
  
  // Toujours afficher le contenu, même pendant le chargement
  if (isAuthPage) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">{children}</div>
  }
  
  // Si pas encore chargé ou pas authentifié, afficher sans sidebar
  if (status === 'loading' || !session) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">{children}</div>
  }

  const allNavigationItems = [
    {
      href: '/',
      label: t('dashboard'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
        </svg>
      )
    },
    {
      href: '/matrices',
      label: t('matrices'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      href: '/workflow',
      label: t('workflow:title'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    // Admin section
    {
      href: '/admin-users',
      label: t('admin:usersAndRoles'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      adminOnly: true
    },
    {
      href: '/admin-rbac',
      label: 'RBAC',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      adminOnly: true
    },
    {
      href: '/admin-audit',
      label: t('common:audit'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      adminOnly: true
    },
    {
      href: '/admin-auth',
      label: t('common:authConfiguration'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      adminOnly: true
    },
    {
      href: '/admin-email',
      label: t('common:emailConfiguration'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      adminOnly: true
    },
    {
      href: '/admin-system',
      label: t('common:systemSettings'),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      adminOnly: true
    }
  ]

  // Filtrer les éléments de navigation selon le rôle de l'utilisateur
  const navigationItems = allNavigationItems.filter(item => {
    if (item.adminOnly) {
      return session.user?.role === 'admin'
    }
    return true
  })
  
  // Utilisateur authentifié, afficher avec sidebar
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar - Toujours fixe */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 shadow-xl
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
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
                <div className="font-bold text-slate-900 dark:text-slate-100">Matrix Flow</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{t('flowManagement')}</div>
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
          
          {/* User menu */}
          <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
            <UserMenu
              onChangePassword={() => setChangePasswordModalOpen(true)}
              onChangeName={() => setChangeNameModalOpen(true)}
              onChangeLanguage={() => setLanguageModalOpen(true)}
              onLogout={() => {
                import('next-auth/react').then(({ signOut }) => signOut())
              }}
            />
          </div>
        </div>
      </aside>
      
      {/* Main content - Avec marge pour la sidebar fixe */}
      <div className="flex-1 lg:ml-64 w-full">
        {/* Header fixe pour desktop et mobile */}
        <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Bouton menu mobile */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
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
              <span className="font-semibold text-slate-900 dark:text-slate-100">Matrix Flow</span>
            </div>
            
            {/* Titre de page ou breadcrumb pour desktop */}
            <div className="hidden lg:block">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {pathname === '/' && t('dashboard')}
                {pathname === '/matrices' && t('matrixManagement')}
                {pathname === '/workflow' && t('workflow:title')}
                {pathname === '/users' && t('userManagement')}
                {pathname.startsWith('/matrices/') && t('matrixDetails')}
                {pathname === '/admin-users' && 'Utilisateurs & Rôles - '}
                {pathname === '/admin-rbac' && 'RBAC - '}
                {pathname === '/admin-audit' && t('common:audit') + ' - '}
                {pathname === '/admin-auth' && 'Authentification - '}
                {pathname === '/admin-email' && 'Messagerie - '}
                {pathname === '/admin-system' && 'Système - '}
                {pathname.startsWith('/admin') && t('admin:administration')}
              </h2>
            </div>
            
            {/* Actions supplémentaires */}
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="hidden lg:block text-sm text-slate-500 dark:text-slate-400">
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

      {/* Modales */}
      <ChangePasswordModal
        isOpen={changePasswordModalOpen}
        onClose={() => setChangePasswordModalOpen(false)}
      />
      <ChangeNameModal
        isOpen={changeNameModalOpen}
        onClose={() => setChangeNameModalOpen(false)}
      />
      <LanguageModal
        isOpen={languageModalOpen}
        onClose={() => setLanguageModalOpen(false)}
      />
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
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
        }
      `}
    >
      <span className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500'}>{icon}</span>
      {children}
    </Link>
  )
}