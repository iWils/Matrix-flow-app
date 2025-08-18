// Types liés à l'authentification et aux utilisateurs

export type GlobalRole = 'admin' | 'user' | 'viewer'

export interface User {
  id: number
  username: string
  email?: string
  fullName?: string | null
  role: GlobalRole
  isActive: boolean
  createdAt: string
  lastPasswordChange?: string | null
  groupMemberships?: UserGroupMembership[]
}

export interface UserGroupMembership {
  group: UserGroup
}

export interface UserGroup {
  id: number
  name: string
  description?: string | null
  permissions: Record<string, string[]>
  isActive: boolean
}

export interface AuthSession {
  user: {
    id: number
    email: string
    name?: string
    role: GlobalRole
  }
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  username: string
  email: string
  fullName?: string
  password: string
  role?: GlobalRole
}

export interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordData {
  email: string
  newPassword: string
  token: string
}

export interface ChangeNameData {
  fullName: string
}