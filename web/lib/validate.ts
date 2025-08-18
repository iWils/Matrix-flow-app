import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

// Schémas pour les groupes RBAC
export const CreateGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  permissions: z.record(z.array(z.string()))
})

export const UpdateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permissions: z.record(z.array(z.string())).optional(),
  isActive: z.boolean().optional()
})

// Schémas pour les utilisateurs
export const RegisterUserSchema = z.object({
  username: z.string().min(3).max(50),
  email: z.union([z.literal(''), z.string().email()]).optional(),
  fullName: z.string().min(1).max(100).optional(),
  password: z.string().min(8),
  role: z.enum(['admin', 'user', 'viewer']).optional()
})

export const UpdateUserSchema = z.object({
  fullName: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'user', 'viewer']).optional(),
  isActive: z.boolean().optional()
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
})

export const ChangeNameSchema = z.object({
  fullName: z.string().min(1).max(100)
})

// Schémas pour les matrices
export const CreateMatrixSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  requiredApprovals: z.number().min(1).max(10).optional()
})

export const UpdateMatrixSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  requiredApprovals: z.number().min(1).max(10).optional()
})

export const CreateMatrixEntrySchema = z.object({
  request_type: z.string().max(100).optional(),
  rule_status: z.string().max(50).optional(),
  rule_name: z.string().min(1, 'Rule name is required').max(255),
  device: z.string().max(100).optional(),
  src_zone: z.string().max(100).optional(),
  src_name: z.string().max(255).optional(),
  src_cidr: z.string().max(100).optional(),
  src_service: z.string().max(255).optional(),
  dst_zone: z.string().max(100).optional(),
  dst_name: z.string().max(255).optional(),
  dst_cidr: z.string().max(100).optional(),
  protocol_group: z.string().max(100).optional(),
  dst_service: z.string().max(255).optional(),
  action: z.string().max(50).optional(),
  implementation_date: z.string().datetime().optional().or(z.string().date().optional()),
  requester: z.string().max(255).optional(),
  comment: z.string().max(1000).optional()
})

export const UpdateMatrixEntrySchema = z.object({
  request_type: z.string().max(100).optional(),
  rule_status: z.string().max(50).optional(),
  rule_name: z.string().min(1, 'Rule name is required').max(255).optional(),
  device: z.string().max(100).optional(),
  src_zone: z.string().max(100).optional(),
  src_name: z.string().max(255).optional(),
  src_cidr: z.string().max(100).optional(),
  src_service: z.string().max(255).optional(),
  dst_zone: z.string().max(100).optional(),
  dst_name: z.string().max(255).optional(),
  dst_cidr: z.string().max(100).optional(),
  protocol_group: z.string().max(100).optional(),
  dst_service: z.string().max(255).optional(),
  action: z.string().max(50).optional(),
  implementation_date: z.string().datetime().optional().or(z.string().date().optional()),
  requester: z.string().max(255).optional(),
  comment: z.string().max(1000).optional()
})

export const MatrixExportSchema = z.object({
  format: z.enum(['csv', 'json', 'excel']).optional().default('csv'),
  includeMetadata: z.boolean().optional().default(false)
})

// Schémas pour les versions
export const CreateMatrixVersionSchema = z.object({
  note: z.string().max(500).optional(),
  snapshot: z.object({
    entries: z.array(z.object({
      id: z.number(),
      row: z.string(),
      column: z.string(),
      value: z.string()
    }))
  })
})

// Schémas pour les permissions
export const ManageGroupMembershipSchema = z.object({
  userId: z.number(),
  groupId: z.number()
})

// Schémas pour l'authentification
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const ResetPasswordSchema = z.object({
  email: z.string().email(),
  newPassword: z.string().min(8),
  token: z.string().min(1)
})

// Schémas pour les actions administrateur sur les utilisateurs
export const AdminResetPasswordSchema = z.object({
  userId: z.number().int().positive(),
  newPassword: z.string().min(8)
})

export const ToggleUserStatusSchema = z.object({
  userId: z.number().int().positive(),
  isActive: z.boolean()
})

const serviceRe = /^\s*(\d{1,5})(?:-(\d{1,5}))?\/(tcp|udp|TCP|UDP)\s*$/

export function validateServiceList(value?: string){
  if(!value) return true
  for(const part of value.split(/[,;]/)){
    const p = part.trim()
    if(!p) continue
    const m = p.match(serviceRe)
    if(!m) return false
    const a = parseInt(m[1],10), b = parseInt(m[2]||m[1],10)
    if(!(a>0 && b>0 && a<=65535 && b<=65535 && a<=b)) return false
  }
  return true
}

// Workflow schemas
export const CreateChangeRequestSchema = z.object({
  matrixId: z.string().min(1, 'Matrix ID is required'),
  entryId: z.string().optional(),
  requestType: z.enum(['create_entry', 'update_entry', 'delete_entry'], {
    required_error: 'Request type is required',
    invalid_type_error: 'Request type must be create_entry, update_entry, or delete_entry'
  }),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  requestedData: z.record(z.unknown())
})

export const ReviewChangeRequestSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    required_error: 'Action is required',
    invalid_type_error: 'Action must be approve or reject'
  }),
  reviewComment: z.string().optional()
})

export const GetChangeRequestsSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  matrixId: z.string().optional(),
  requestType: z.enum(['create_entry', 'update_entry', 'delete_entry']).optional()
})

// Dashboard schemas
export const DashboardStatsSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d']).optional().default('30d')
})
export const MatrixImportSchema = z.object({
  format: z.enum(['csv', 'json']).optional().default('csv'),
  overwrite: z.boolean().optional().default(false),
  skipValidation: z.boolean().optional().default(false)
})

// Admin schemas
export const SystemSettingsSchema = z.object({
  general: z.object({
    appName: z.string().min(1).max(100).optional(),
    appDescription: z.string().max(500).optional(),
    defaultLanguage: z.string().min(2).max(10).optional(),
    timezone: z.string().optional(),
    maintenanceMode: z.boolean().optional()
  }).optional(),
  security: z.object({
    sessionTimeout: z.number().min(5).max(1440).optional(),
    passwordMinLength: z.number().min(4).max(50).optional(),
    passwordRequireSpecialChars: z.boolean().optional(),
    maxLoginAttempts: z.number().min(1).max(20).optional(),
    lockoutDuration: z.number().min(1).max(120).optional()
  }).optional(),
  audit: z.object({
    retentionDays: z.number().min(1).max(3650).optional(),
    logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
    enableFileLogging: z.boolean().optional(),
    maxLogFileSize: z.number().min(1).max(1000).optional()
  }).optional(),
  backup: z.object({
    autoBackup: z.boolean().optional(),
    backupFrequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
    retentionCount: z.number().min(1).max(365).optional(),
    backupLocation: z.string().optional()
  }).optional()
})

export const EmailSettingsSchema = z.object({
  smtp: z.object({
    host: z.string().min(1, 'SMTP host is required'),
    port: z.number().min(1).max(65535),
    secure: z.boolean(),
    username: z.string().min(1, 'SMTP username is required'),
    password: z.string().min(1, 'SMTP password is required')
  }).optional(),
  from: z.object({
    name: z.string().min(1, 'From name is required'),
    email: z.string().email('Valid email is required')
  }).optional(),
  enabled: z.boolean()
})

export const AdminDashboardSchema = z.object({
  timeRange: z.enum(['24h', '7d', '30d', '90d']).optional().default('24h'),
  includeSystemHealth: z.boolean().optional().default(true)
})
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return (handler: (req: NextRequest, validated: T) => Promise<Response>) => {
    return async (req: NextRequest) => {
      try {
        const body = await req.json()
        const validated = schema.parse(body)
        return handler(req, validated)
      } catch (error) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
      }
    }
  }
}