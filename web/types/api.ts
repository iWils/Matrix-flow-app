// Types liés aux réponses API, erreurs et pagination

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface ApiError {
  error: string
  details?: string
  code?: string
  statusCode?: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface SearchParams {
  query?: string
  filters?: Record<string, any>
  sort?: {
    field: string
    direction: 'asc' | 'desc'
  }
}

// Types pour les réponses d'authentification
export interface AuthResponse {
  user: {
    id: number
    email: string
    name?: string
    role: string
  }
  token?: string
}

export interface RegisterResponse extends ApiResponse<AuthResponse> {}
export interface LoginResponse extends ApiResponse<AuthResponse> {}

// Types pour les réponses des utilisateurs
export interface UsersResponse extends ApiResponse<any[]> {}
export interface UserResponse extends ApiResponse<any> {}

// Types pour les réponses des matrices
export interface MatricesResponse extends ApiResponse<any[]> {}
export interface MatrixResponse extends ApiResponse<any> {}
export interface MatrixVersionsResponse extends ApiResponse<any[]> {}
export interface MatrixEntriesResponse extends ApiResponse<any[]> {}

// Types pour les réponses RBAC
export interface GroupsResponse extends ApiResponse<any[]> {}
export interface GroupResponse extends ApiResponse<any> {}
export interface PermissionsResponse extends ApiResponse<any> {}

// Types pour les réponses d'audit
export interface AuditLogsResponse extends ApiResponse<any[]> {}
export interface AuditStatsResponse extends ApiResponse<any> {}

// Types pour les réponses du dashboard
export interface DashboardStatsResponse extends ApiResponse<{
  totalUsers: number
  totalMatrices: number
  totalEntries: number
  recentActivity: number
}> {}

// Types pour les réponses de workflow
export interface WorkflowChangesResponse extends ApiResponse<any[]> {}
export interface WorkflowChangeResponse extends ApiResponse<any> {}

// Types pour les exports/imports
export interface ExportResponse extends ApiResponse<{
  url: string
  filename: string
  expiresAt: Date
}> {}

export interface ImportResponse extends ApiResponse<{
  imported: number
  errors: string[]
  warnings: string[]
}> {}

// Types pour les validations
export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface ValidationResponse {
  valid: boolean
  errors?: ValidationError[]
}

// Types pour les opérations en lot (bulk)
export interface BulkOperation<T> {
  operation: 'create' | 'update' | 'delete'
  data: T[]
}

export interface BulkResponse {
  success: number
  failed: number
  errors: Array<{
    index: number
    error: string
  }>
}

// Types pour les notifications système
export interface SystemNotification {
  id: string
  type: 'info' | 'warning' | 'error' | 'success'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actions?: Array<{
    label: string
    action: string
  }>
}

// Types pour les métriques et monitoring
export interface SystemMetrics {
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  database: {
    connections: number
    queries: number
    avgResponseTime: number
  }
  api: {
    requests: number
    errors: number
    avgResponseTime: number
  }
}

// Types pour les configurations système
export interface SystemSettings {
  siteName: string
  maintenance: boolean
  registrationEnabled: boolean
  emailNotifications: boolean
  maxFileSize: number
  allowedFileTypes: string[]
  sessionTimeout: number
}

// Types pour les templates d'email
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  isActive: boolean
}

export interface EmailSettings {
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  fromEmail: string
  fromName: string
  encryption: 'none' | 'tls' | 'ssl'
}