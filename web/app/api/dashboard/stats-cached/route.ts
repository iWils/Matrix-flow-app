import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { ApiResponse } from '@/types'
import { MatrixCache, cache } from '@/lib/cache'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized access attempt to dashboard stats', {
      endpoint: '/api/dashboard/stats-cached',
      method: 'GET'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }
  
  try {
    const userId = parseInt(session.user.id as string)
    logger.info('Fetching cached dashboard statistics', {
      userId,
      userRole: session.user.role,
      endpoint: '/api/dashboard/stats-cached'
    })

    const startTime = Date.now()

    // Tenter de récupérer depuis le cache Redis
    const cachedStats = await MatrixCache.getDashboardStats(userId)
    
    if (cachedStats) {
      logger.info('Dashboard stats served from cache', {
        userId,
        cacheHit: true,
        responseTime: Date.now() - startTime
      })
      
      return NextResponse.json({
        success: true,
        data: {
          ...cachedStats,
          cached: true,
          cacheTime: new Date().toISOString()
        }
      })
    }

    // Si pas en cache, calculer les statistiques
    logger.info('Cache miss - calculating dashboard stats', { userId })

    // Statistiques globales (pour les admins) ou personnalisées (pour les utilisateurs)
    let statsPromises: Promise<unknown>[]

    if (session.user.role === 'admin') {
      // Statistiques complètes pour les administrateurs
      statsPromises = [
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
        prisma.auditLog.count({
          where: {
            at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        }),
        prisma.changeRequest.count({
          where: { status: 'pending' }
        }),
        // Matrices créées ce mois
        prisma.matrix.count({
          where: {
            createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
          }
        }),
        // Top 5 des matrices les plus utilisées (par nombre d'entrées)
        prisma.matrix.findMany({
          select: {
            id: true,
            name: true,
            _count: {
              select: { entries: true }
            }
          },
          orderBy: {
            entries: { _count: 'desc' }
          },
          take: 5
        }),
        // Activité récente
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { at: 'desc' },
          include: {
            user: {
              select: { username: true, fullName: true }
            }
          }
        }),
        // Statistiques par action (pour graphiques)
        prisma.flowEntry.groupBy({
          by: ['action'],
          _count: {
            _all: true
          }
        }),
        // Statistiques par statut de règle
        prisma.flowEntry.groupBy({
          by: ['rule_status'],
          _count: {
            _all: true
          },
          where: {
            rule_status: { not: null }
          }
        })
      ]
    } else {
      // Statistiques limitées pour les utilisateurs non-admin
      const userMatrixIds = await prisma.matrix.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { 
              permissions: { 
                some: { 
                  userId,
                  role: { in: ['owner', 'editor', 'viewer'] }
                } 
              } 
            }
          ]
        },
        select: { id: true }
      }).then(matrices => matrices.map(m => m.id))

      statsPromises = [
        // Nombre de matrices accessibles à l'utilisateur
        Promise.resolve(userMatrixIds.length),
        // Nombre d'entrées dans ces matrices
        prisma.flowEntry.count({
          where: { matrixId: { in: userMatrixIds } }
        }),
        // Matrices créées par l'utilisateur
        prisma.matrix.count({
          where: { ownerId: userId }
        }),
        // Demandes de changement en attente pour l'utilisateur
        prisma.changeRequest.count({
          where: {
            requestedById: userId,
            status: 'pending'
          }
        }),
        // Activité récente de l'utilisateur
        prisma.auditLog.findMany({
          where: { userId },
          take: 5,
          orderBy: { at: 'desc' }
        }),
        // Matrices de l'utilisateur avec le plus d'entrées
        prisma.matrix.findMany({
          where: { ownerId: userId },
          select: {
            id: true,
            name: true,
            _count: {
              select: { entries: true }
            }
          },
          orderBy: {
            entries: { _count: 'desc' }
          },
          take: 3
        })
      ]
    }

    const results = await Promise.all(statsPromises)
    
    let dashboardStats: Record<string, unknown>

    if (session.user.role === 'admin') {
      const [
        totalMatrices,
        totalEntries,
        totalUsers,
        activeUsers,
        activeSessions,
        recentActivityCount,
        pendingRequests,
        matricesThisMonth,
        topMatrices,
        recentActivity,
        actionStats,
        statusStats
      ] = results as [
        number, number, number, number, number, number, number, number,
        unknown[], unknown[], unknown[], unknown[]
      ]

      dashboardStats = {
        overview: {
          totalMatrices,
          totalEntries,
          totalUsers,
          activeUsers,
          activeSessions,
          recentActivityCount,
          pendingRequests,
          matricesThisMonth
        },
        charts: {
          actionDistribution: Array.isArray(actionStats) ? actionStats.map((stat: unknown) => ({
            action: (stat as {action?: string}).action || 'Non spécifié',
            count: (stat as {_count: {_all: number}})._count._all
          })) : [],
          statusDistribution: Array.isArray(statusStats) ? statusStats.map((stat: unknown) => ({
            status: (stat as {rule_status?: string}).rule_status || 'Non spécifié',
            count: (stat as {_count: {_all: number}})._count._all
          })) : []
        },
        topMatrices: Array.isArray(topMatrices) ? topMatrices.map((matrix: unknown) => ({
          id: (matrix as {id: number}).id,
          name: (matrix as {name: string}).name,
          entryCount: (matrix as {_count: {entries: number}})._count.entries
        })) : [],
        recentActivity: Array.isArray(recentActivity) ? recentActivity.map((activity: unknown) => ({
          id: (activity as {id: number}).id,
          action: (activity as {action: string}).action,
          resource: (activity as {resource: string}).resource,
          user: (activity as {user?: {fullName?: string, username?: string}}).user?.fullName || (activity as {user?: {username?: string}}).user?.username,
          timestamp: (activity as {createdAt: Date}).createdAt,
          details: (activity as {details?: unknown}).details
        })) : []
      }
    } else {
      const [
        accessibleMatrices,
        totalEntries,
        ownedMatrices,
        pendingRequests,
        recentActivity,
        topUserMatrices
      ] = results as [
        number, number, number, number, unknown[], unknown[]
      ]

      dashboardStats = {
        overview: {
          accessibleMatrices,
          totalEntries,
          ownedMatrices,
          pendingRequests
        },
        topMatrices: Array.isArray(topUserMatrices) ? topUserMatrices.map((matrix: unknown) => ({
          id: (matrix as {id: number}).id,
          name: (matrix as {name: string}).name,
          entryCount: (matrix as {_count: {entries: number}})._count.entries
        })) : [],
        recentActivity: Array.isArray(recentActivity) ? recentActivity.map((activity: unknown) => ({
          id: (activity as {id: number}).id,
          action: (activity as {action: string}).action,
          resource: (activity as {resource: string}).resource,
          timestamp: (activity as {createdAt: Date}).createdAt,
          details: (activity as {details?: unknown}).details
        })) : []
      }
    }

    // Ajouter les métadonnées
    const finalStats = {
      ...dashboardStats,
      metadata: {
        userId,
        userRole: session.user.role,
        generatedAt: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        cached: false
      }
    }

    // Mettre en cache pour les prochaines requêtes
    await MatrixCache.setDashboardStats(userId, finalStats)

    logger.info('Dashboard stats calculated and cached', {
      userId,
      responseTime: Date.now() - startTime,
      totalMatrices: (finalStats as {overview?: {totalMatrices?: number, accessibleMatrices?: number}}).overview?.totalMatrices || (finalStats as {overview?: {accessibleMatrices?: number}}).overview?.accessibleMatrices
    })

    return NextResponse.json({
      success: true,
      data: finalStats
    })

  } catch (error) {
    logger.error('Error fetching dashboard stats', error as Error, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/dashboard/stats-cached'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

// Endpoint pour forcer la mise à jour du cache
export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const userId = parseInt(session.user.id as string)
    
    // Invalider le cache existant
    await MatrixCache.invalidateDashboardStats(userId)
    
    logger.info('Dashboard cache invalidated by user', { userId })
    
    return NextResponse.json({
      success: true,
      message: 'Cache invalidé avec succès'
    })
    
  } catch (error) {
    logger.error('Error invalidating dashboard cache', error as Error)
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de l\'invalidation du cache'
    }, { status: 500 })
  }
}

// Endpoint pour obtenir des informations sur le cache
export async function PATCH() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const cacheInfo = await cache.info()
    const userId = parseInt(session.user.id as string)
    const userCacheExists = await MatrixCache.getDashboardStats(userId) !== null
    
    return NextResponse.json({
      success: true,
      data: {
        cacheAvailable: cacheInfo !== null,
        userCacheExists,
        cacheInfo: cacheInfo ? cacheInfo.split('\n').slice(0, 10) : null // Limiter les infos
      }
    })
    
  } catch (error) {
    logger.error('Error getting cache info', error as Error)
    
    return NextResponse.json({
      success: false,
      error: 'Erreur lors de la récupération des informations du cache'
    }, { status: 500 })
  }
}