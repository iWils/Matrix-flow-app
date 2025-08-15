import { useSession } from 'next-auth/react'
import { useMemo } from 'react'

export type GlobalRole = 'admin' | 'user' | 'viewer'
export type MatrixRole = 'owner' | 'editor' | 'viewer'

export interface MatrixPermission {
  role: MatrixRole
  user: {
    username: string
    fullName?: string
  }
}

export interface UsePermissionsProps {
  matrixId?: number
  matrixOwnerId?: number
  matrixPermissions?: MatrixPermission[]
}

export function usePermissions({ matrixId, matrixOwnerId, matrixPermissions }: UsePermissionsProps = {}) {
  const { data: session } = useSession()

  const permissions = useMemo(() => {
    if (!session?.user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        isUser: false,
        isViewer: false,
        canViewMatrix: false,
        canEditMatrix: false,
        canOwnMatrix: false,
        canDeleteMatrix: false,
        canManageUsers: false,
        canViewAudit: false,
        userMatrixRole: null as MatrixRole | null,
        isMatrixOwner: false,
        isMatrixEditor: false,
        isMatrixViewer: false
      }
    }

    const userRole = session.user.role as GlobalRole
    const userId = session.user.id

    // Permissions globales basées sur le rôle
    const isAdmin = userRole === 'admin'
    const isUser = userRole === 'user'
    const isViewer = userRole === 'viewer'

    // Permissions spécifiques aux matrices
    let canViewMatrix = isAdmin
    let canEditMatrix = isAdmin
    let canOwnMatrix = isAdmin
    let userMatrixRole: MatrixRole | null = null
    let isMatrixOwner = false
    let isMatrixEditor = false
    let isMatrixViewer = false

    if (matrixId && matrixPermissions) {
      // Trouver la permission de l'utilisateur pour cette matrice
      const userPermission = matrixPermissions.find(p =>
        p.user.username === session.user.email
      )

      if (userPermission) {
        userMatrixRole = userPermission.role
        canViewMatrix = true
        canEditMatrix = userPermission.role === 'owner' || userPermission.role === 'editor'
        canOwnMatrix = userPermission.role === 'owner'
        
        isMatrixOwner = userPermission.role === 'owner'
        isMatrixEditor = userPermission.role === 'editor'
        isMatrixViewer = userPermission.role === 'viewer'
      }
    }

    // Vérifier si l'utilisateur est le propriétaire de la matrice
    if (matrixOwnerId && userId === matrixOwnerId) {
      isMatrixOwner = true
      canViewMatrix = true
      canEditMatrix = true
      canOwnMatrix = true
      userMatrixRole = 'owner'
    }

    return {
      isAuthenticated: true,
      isAdmin,
      isUser,
      isViewer,
      canViewMatrix,
      canEditMatrix,
      canOwnMatrix,
      canCreateMatrix: isAdmin || isUser, // Seuls les admins et users peuvent créer des matrices
      canDeleteMatrix: isAdmin, // Seuls les admins peuvent supprimer
      canManageUsers: isAdmin,
      canViewAudit: isAdmin,
      userMatrixRole,
      isMatrixOwner,
      isMatrixEditor,
      isMatrixViewer
    }
  }, [session, matrixId, matrixOwnerId, matrixPermissions])

  return permissions
}

// Hook simplifié pour les permissions globales
export function useGlobalPermissions() {
  const { data: session } = useSession()

  return useMemo(() => {
    if (!session?.user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        isUser: false,
        isViewer: false,
        canManageUsers: false,
        canViewAudit: false
      }
    }

    const userRole = session.user.role as GlobalRole
    const isAdmin = userRole === 'admin'

    return {
      isAuthenticated: true,
      isAdmin,
      isUser: userRole === 'user',
      isViewer: userRole === 'viewer',
      canCreateMatrix: isAdmin || userRole === 'user', // Seuls les admins et users peuvent créer des matrices
      canManageUsers: isAdmin,
      canViewAudit: isAdmin
    }
  }, [session])
}