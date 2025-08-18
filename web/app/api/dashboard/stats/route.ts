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
      userId: session.user.id,
      userRole: session.user.role,
      endpoint: '/api/dashboard/stats'
    })

    const startTime = Date.now()

    // Récupérer les statistiques avec des requêtes optimisées
    const [
      totalMatrices,
      totalEntries,
      totalUsers,
      activeUsers,
      matricesStats,
      recentActivity
    ] = await Promise.all([
      // Statistiques de base
      prisma.matrix.count(),
      prisma.flowEntry.count(),
      prisma.user.count(),
      
      // Utilisateurs actifs (connectés dans les 30 derniers jours)
      prisma.user.count({
        where: {
          isActive: true,
          lastPasswordChange: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Statistiques détaillées des matrices
      prisma.matrix.groupBy({
        by: ['ownerId'],
        _count: {
          id: true
        },
        take: 5,
        orderBy: {
          _count: {
            id: 'desc'
          }
        }
      }),
      
      // Activité récente avec plus de contexte
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

    // Statistiques supplémentaires pour les admins
    let adminStats = {}
    if (session.user.role === 'admin') {
      const [inactiveUsers, pendingChanges, recentErrors] = await Promise.all([
        prisma.user.count({
          where: { isActive: false }
        }),
        // Supposons qu'il y ait une table pour les changements en attente
        prisma.auditLog.count({
          where: {
            action: 'create',
            at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Dernières 24h
            }
          }
        }),
        // Compter les erreurs récentes dans les logs
        prisma.auditLog.count({
          where: {
            entity: 'Error',
            at: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
            }
          }
        })
      ])

      adminStats = {
        inactiveUsers,
        recentChanges: pendingChanges,
        recentErrors
      }
    }

    // Formater l'activité récente
    const formattedRecentActivity = recentActivity.map((log: any) => ({
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
      userId: session.user.id,
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
      overview: {
        totalMatrices,
        totalEntries,
        totalUsers,
        activeUsers
      },
      matrices: {
        total: totalMatrices,
        topOwners: matricesStats.slice(0, 5)
      },
      activity: {
        recent: formattedRecentActivity,
        count: formattedRecentActivity.length
      },
      performance: {
        responseTimeMs: responseTime
      },
      ...(session.user.role === 'admin' && { admin: adminStats })
    }

    const response: ApiResponse<typeof dashboardData> = {
      success: true,
      data: dashboardData
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching dashboard statistics', error as Error, {
      userId: session.user.id,
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
