
import { prisma } from './db'
// Types pour l'audit
type AuditAction = 'create' | 'update' | 'delete'
import { logger } from './logger'

export interface AuditLogOptions {
  userId?: number
  matrixId?: number
  entity: string
  entityId: number
  action: AuditAction
  changes: Record<string, unknown>
  ip?: string
  userAgent?: string
}

export async function auditLog(opts: AuditLogOptions) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: opts.userId,
        matrixId: opts.matrixId,
        entity: opts.entity,
        entityId: opts.entityId,
        action: opts.action,
        changes: opts.changes ? JSON.parse(JSON.stringify(opts.changes)) : null,
        ip: opts.ip,
        userAgent: opts.userAgent
      }
    })
  } catch (error) {
    logger.error('Failed to create audit log', error as Error, {
      entity: opts.entity,
      entityId: opts.entityId,
      action: opts.action,
      userId: opts.userId,
      matrixId: opts.matrixId
    })
    // Ne pas faire échouer l'opération principale si l'audit échoue
  }
}

// Fonction helper pour capturer automatiquement les métadonnées depuis une requête
export async function auditLogFromRequest(
  request: Request,
  opts: Omit<AuditLogOptions, 'ip' | 'userAgent'>
) {
  const ip = request.headers.get('x-forwarded-for') ||
             request.headers.get('x-real-ip') ||
             'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'
  
  return auditLog({
    ...opts,
    ip,
    userAgent
  })
}
