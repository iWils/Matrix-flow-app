
import { prisma } from './db'
import { AuditAction } from '@prisma/client'

export async function auditLog(opts: { userId?: number, matrixId?: number, entity: string, entityId: number, action: AuditAction, changes: any }){
  await prisma.auditLog.create({ data: {
    userId: opts.userId, matrixId: opts.matrixId, entity: opts.entity, entityId: opts.entityId, action: opts.action, changes: opts.changes
  }})
}
