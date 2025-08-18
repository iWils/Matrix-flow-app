import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { ApiResponse, PaginatedResponse } from '@/types'

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized access attempt to audit logs', {
      endpoint: '/api/audit',
      method: 'GET'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Non autorisé'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }

  // Vérifier que l'utilisateur est admin
  if (session.user.role !== 'admin') {
    logger.warn('Non-admin user attempted to access audit logs', {
      userId: session.user.id,
      userRole: session.user.role,
      endpoint: '/api/audit'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Accès refusé - Droits administrateur requis'
    }
    
    return NextResponse.json(errorResponse, { status: 403 })
  }

  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const entityFilter = url.searchParams.get('entity')
    const actionFilter = url.searchParams.get('action')

    logger.info('Fetching audit logs', {
      adminId: session.user.id,
      limit,
      offset,
      entityFilter,
      actionFilter,
      endpoint: '/api/audit'
    })

    // Construire les filtres dynamiquement
    const whereClause: any = {}
    if (entityFilter) {
      whereClause.entity = entityFilter
    }
    if (actionFilter) {
      whereClause.action = actionFilter
    }

    // Récupérer les logs d'audit avec pagination et filtres
    const [auditLogs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              fullName: true,
              role: true
            }
          }
        },
        orderBy: {
          at: 'desc'
        },
        take: Math.min(limit, 500), // Maximum 500 pour éviter la surcharge
        skip: offset
      }),
      prisma.auditLog.count({
        where: whereClause
      })
    ])

    // Transformer les données pour correspondre au format attendu
    const formattedLogs = auditLogs.map((log: any) => ({
      id: log.id,
      entity: log.entity,
      entityId: log.entityId,
      action: log.action,
      at: log.at.toISOString(),
      user: log.user ? {
        id: log.user.id,
        username: log.user.username,
        fullName: log.user.fullName,
        role: log.user.role
      } : null,
      changes: log.changes,
      metadata: {
        ip: log.ip,
        userAgent: log.userAgent
      }
    }))

    logger.info('Audit logs fetched successfully', {
      adminId: session.user.id,
      logsCount: formattedLogs.length,
      totalCount,
      filters: { entityFilter, actionFilter },
      pagination: { limit, offset }
    })

    const response: ApiResponse<{
      logs: typeof formattedLogs,
      pagination: {
        total: number,
        count: number,
        offset: number,
        limit: number,
        hasMore: boolean
      }
    }> = {
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          total: totalCount,
          count: formattedLogs.length,
          offset,
          limit,
          hasMore: offset + formattedLogs.length < totalCount
        }
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching audit logs', error as Error, {
      adminId: session.user.id,
      endpoint: '/api/audit'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}