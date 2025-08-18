import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { useUserGroups } from './useUserGroups'
import { GlobalRole, UserGroup, MatrixRole, MatrixPermission, UsePermissionsProps, RBACPermissions, GlobalPermissions } from '@/types'

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

// Hook simplifié pour les permissions globales avec support RBAC
export function useGlobalPermissions() {
  const { data: session } = useSession()
  const { permissions: groupPermissions, hasPermission, loading } = useUserGroups()

  return useMemo(() => {
    if (!session?.user) {
      return {
        isAuthenticated: false,
        isAdmin: false,
        isUser: false,
        isViewer: false,
        canManageUsers: false,
        canViewAudit: false,
        canCreateMatrix: false,
        loading: false
      }
    }

    const userRole = session.user.role as GlobalRole
    const isAdmin = userRole === 'admin'

    // Permissions de base selon le rôle
    let canManageUsers = isAdmin
    let canViewAudit = isAdmin
    let canCreateMatrix = isAdmin || userRole === 'user'

    // Ajouter les permissions des groupes RBAC
    if (!loading) {
      // Permissions utilisateurs : peut gérer les utilisateurs si a la permission 'manage_roles' sur 'users'
      if (hasPermission('users', 'manage_roles') || hasPermission('users', 'create')) {
        canManageUsers = true
      }

      // Permissions audit : peut voir l'audit si a la permission 'read' sur 'audit'
      if (hasPermission('audit', 'read')) {
        canViewAudit = true
      }

      // Permissions matrices : peut créer des matrices si a la permission 'create' sur 'matrices'
      if (hasPermission('matrices', 'create')) {
        canCreateMatrix = true
      }
    }

    return {
      isAuthenticated: true,
      isAdmin,
      isUser: userRole === 'user',
      isViewer: userRole === 'viewer',
      canCreateMatrix,
      canManageUsers,
      canViewAudit,
      loading,
      // Exposer les permissions des groupes pour usage avancé
      groupPermissions,
      hasPermission,
      // Permissions spécifiques supplémentaires
      canManageSystem: isAdmin || hasPermission('system', 'configure'),
      canBackupSystem: isAdmin || hasPermission('system', 'backup'),
      canExportAudit: isAdmin || hasPermission('audit', 'export'),
      canConfigureAudit: isAdmin || hasPermission('audit', 'configure')
    }
  }, [session, groupPermissions, hasPermission, loading])
}