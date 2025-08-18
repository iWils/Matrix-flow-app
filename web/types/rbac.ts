// Types liés au contrôle d'accès basé sur les rôles (RBAC)

import { GlobalRole } from './auth'

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

export interface Permission {
  resource: string
  actions: string[]
}

export interface GroupPermissions {
  [resource: string]: string[]
}

export interface RBACPermissions {
  isAuthenticated: boolean
  isAdmin: boolean
  isUser: boolean
  isViewer: boolean
  canViewMatrix: boolean
  canEditMatrix: boolean
  canOwnMatrix: boolean
  canCreateMatrix: boolean
  canDeleteMatrix: boolean
  canManageUsers: boolean
  canViewAudit: boolean
  userMatrixRole: MatrixRole | null
  isMatrixOwner: boolean
  isMatrixEditor: boolean
  isMatrixViewer: boolean
}

export interface GlobalPermissions {
  isAuthenticated: boolean
  isAdmin: boolean
  isUser: boolean
  isViewer: boolean
  canManageUsers: boolean
  canViewAudit: boolean
  canCreateMatrix: boolean
  loading: boolean
  groupPermissions: GroupPermissions
  hasPermission: (resource: string, action: string) => boolean
  canManageSystem: boolean
  canBackupSystem: boolean
  canExportAudit: boolean
  canConfigureAudit: boolean
}

export interface UserGroupData {
  id: number
  name: string
  description: string | null
  permissions: GroupPermissions
  isActive: boolean
  memberCount?: number
  createdAt?: string
}

export interface CreateGroupData {
  name: string
  description?: string
  permissions: GroupPermissions
}

export interface UpdateGroupData {
  name?: string
  description?: string
  permissions?: GroupPermissions
  isActive?: boolean
}

export interface GroupMembershipData {
  userId: number
  groupId: number
}

// Ressources et actions standard du système
export const RESOURCES = {
  USERS: 'users',
  MATRICES: 'matrices', 
  AUDIT: 'audit',
  SYSTEM: 'system',
  GROUPS: 'groups'
} as const

export const ACTIONS = {
  CREATE: 'create',
  READ: 'read', 
  UPDATE: 'update',
  DELETE: 'delete',
  MANAGE_ROLES: 'manage_roles',
  EXPORT: 'export',
  IMPORT: 'import',
  CONFIGURE: 'configure',
  BACKUP: 'backup'
} as const

export type ResourceType = typeof RESOURCES[keyof typeof RESOURCES]
export type ActionType = typeof ACTIONS[keyof typeof ACTIONS]