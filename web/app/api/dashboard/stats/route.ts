import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { ApiResponse } from '@/types'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized access attempt to dashboard stats', {
      endpoint: '/api/dashboard/stats',
      method: 'GET'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }
  
  try {
    logger.info('Fetching dashboard statistics', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/dashboard/stats'
    })

    const startTime = Date.now()

    // Récupérer les statistiques de base pour tous les utilisateurs
    const [
      totalMatrices,
      totalEntries,
      totalUsers,
      activeUsers,
      activeSessions,
      recentActivity
    ] = await Promise.all([
      prisma.matrix.count(),
      prisma.flowEntry.count(),
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.userSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      }),
      prisma.auditLog.findMany({
        take: 15,
        orderBy: { at: 'desc' },
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
        where: {
          at: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 derniers jours
          }
        }
      })
    ])

    // Statistiques avancées pour les admins
    let adminStats = null
    if (session.user.role === 'admin') {
      const now = new Date()
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      
      const [
        inactiveUsers,
        adminUsers,
        recentRegistrations,
        totalAuditLogs,
        recentMatrices,
        pendingChangeRequests
      ] = await Promise.all([
        prisma.user.count({ where: { isActive: false } }),
        prisma.user.count({ where: { role: 'admin' } }),
        prisma.user.count({
          where: {
            createdAt: { gte: last24h }
          }
        }),
        prisma.auditLog.count({
          where: {
            at: { gte: last24h }
          }
        }),
        prisma.matrix.count({
          where: {
            updatedAt: { gte: last24h }
          }
        }),
        prisma.changeRequest.count({
          where: { status: 'pending' }
        }).catch(() => 0) // Au cas où la table n'existe pas encore
      ])

      // Vérification de la santé du système
      const systemHealth = {
        database: 'healthy' as 'healthy' | 'warning' | 'error',
        auth: 'healthy' as 'healthy' | 'warning' | 'error',
        audit: 'healthy' as 'healthy' | 'warning' | 'error'
      }

      // Test de la base de données
      try {
        const dbStartTime = Date.now()
        await prisma.$queryRaw`SELECT 1`
        const dbResponseTime = Date.now() - dbStartTime
        
        if (dbResponseTime > 5000) {
          systemHealth.database = 'error'
        } else if (dbResponseTime > 1000) {
          systemHealth.database = 'warning'
        }
      } catch {
        systemHealth.database = 'error'
      }

      // Test du système d'audit
      const recentLogs = await prisma.auditLog.count({
        where: {
          at: { gte: last24h }
        }
      })
      
      if (recentLogs === 0) {
        systemHealth.audit = 'warning'
      }

      adminStats = {
        userStats: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers,
          adminCount: adminUsers,
          recentRegistrations
        },
        matrixStats: {
          total: totalMatrices,
          totalEntries,
          recentlyModified: recentMatrices,
          pendingChangeRequests
        },
        auditStats: {
          totalLogs: totalAuditLogs
        },
        systemHealth,
        performanceMetrics: {
          avgResponseTime: Date.now() - startTime,
          errorRate: 0,
          uptime: 99.9
        }
      }
    }

    // Formater l'activité récente
    const formattedRecentActivity = recentActivity.map((log) => ({
      id: log.id,
      entity: log.entity,
      action: log.action,
      at: log.at.toISOString(),
      user: log.user ? {
        id: log.user.id,
        username: log.user.username,
        fullName: log.user.fullName,
        role: log.user.role
      } : null,
      changes: log.changes
    }))

    const responseTime = Date.now() - startTime

    logger.info('Dashboard statistics fetched successfully', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      responseTimeMs: responseTime,
      stats: {
        totalMatrices,
        totalEntries,
        totalUsers,
        activeUsers,
        recentActivityCount: formattedRecentActivity.length
      }
    })

    const dashboardData = {
      totalMatrices,
      totalEntries,
      totalUsers,
      activeSessions,
      recentActivity: formattedRecentActivity,
      ...(adminStats && { adminStats })
    }

    const response: ApiResponse<typeof dashboardData> = {
      success: true,
      data: dashboardData
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching dashboard statistics', error as Error, {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/dashboard/stats'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
