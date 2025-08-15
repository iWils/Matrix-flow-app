'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { useGlobalPermissions } from '@/hooks/usePermissions'

interface ProtectedRouteProps {
  children: ReactNode
  requireAdmin?: boolean
  requireAuth?: boolean
  fallbackPath?: string
  customErrorMessage?: string
}

export function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireAuth = true,
  fallbackPath = '/',
  customErrorMessage
}: ProtectedRouteProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const permissions = useGlobalPermissions()

  useEffect(() => {
    if (status === 'loading') return // Attendre le chargement de la session

    if (requireAuth && !permissions.isAuthenticated) {
      router.push('/login')
      return
    }

    if (requireAdmin && !permissions.isAdmin) {
      // Ne pas rediriger automatiquement pour les admins, afficher l'erreur
      return
    }
  }, [status, permissions, requireAuth, requireAdmin, router])

  // Affichage du loading pendant le chargement de la session
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  // Vérification de l'authentification
  if (requireAuth && !permissions.isAuthenticated) {
    return (
      <Alert variant="error">
        Vous devez être connecté pour accéder à cette page.
        <Button 
          variant="outline" 
          className="ml-4" 
          onClick={() => router.push('/login')}
        >
          Se connecter
        </Button>
      </Alert>
    )
  }

  // Vérification des permissions admin
  if (requireAdmin && !permissions.isAdmin) {
    return (
      <Alert variant="error">
        {customErrorMessage || 'Accès refusé. Seuls les administrateurs peuvent accéder à cette page.'}
        <Button 
          variant="outline" 
          className="ml-4" 
          onClick={() => router.push(fallbackPath)}
        >
          Retour
        </Button>
      </Alert>
    )
  }

  return <>{children}</>
}

// Composant spécialisé pour les routes admin
export function AdminRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requireAdmin'>) {
  return (
    <ProtectedRoute requireAdmin={true} {...props}>
      {children}
    </ProtectedRoute>
  )
}

// Composant spécialisé pour les routes authentifiées
export function AuthRoute({ children, ...props }: Omit<ProtectedRouteProps, 'requireAuth'>) {
  return (
    <ProtectedRoute requireAuth={true} {...props}>
      {children}
    </ProtectedRoute>
  )
}