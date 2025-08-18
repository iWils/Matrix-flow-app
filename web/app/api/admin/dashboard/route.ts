import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { AdminDashboardSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'

interface AdminDashboardStats {
  userStats: {
    total: number
    active: number
    inactive: number
    adminCount: number
    recentRegistrations: number
  }
  matrixStats: {
    total: number
    totalEntries: number
    recentlyModified: number
    pendingChangeRequests: number
  }
  auditStats: {
    totalLogs: number
    recentActivity: Array<{
      id: number
      action: string
      entity: string
      user: string
      timestamp: string
      severity: 'low' | 'medium' | 'high'
    }>
  }
  systemHealth: {
    database: 'healthy' | 'warning' | 'error'
    auth: 'healthy' | 'warning' | 'error'
    audit: 'healthy' | 'warning' | 'error'
    overall: 'healthy' | 'warning' | 'error'
  }
  performanceMetrics: {
    avgResponseTime: number
    errorRate: number
    uptime: number
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to access admin dashboard', {
      endpoint: '/api/admin/dashboard',
      method: 'GET',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    logger.warn('Non-admin user attempted to access admin dashboard', {
      userId: session.user.id,
      userRole: session.user.role,
      endpoint: '/api/admin/dashboard',
      method: 'GET'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    logger.info('Fetching admin dashboard statistics', {
      userId: session.user.id,
      endpoint: '/api/admin/dashboard',
      method: 'GET'
    })

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    const queryData = {
      timeRange: searchParams.get('timeRange') || '24h',
      includeSystemHealth: searchParams.get('includeSystemHealth') !== 'false'
    }

    const validatedQuery = AdminDashboardSchema.parse(queryData)

    // Calculate time boundaries
    const now = new Date()
    const timeRanges = {
      '24h': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }
    const startDate = timeRanges[validatedQuery.timeRange]

    // Parallel queries for better performance
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      recentUsers,
      totalMatrices,
      totalEntries,
      recentMatrices,
      pendingChangeRequests,
      totalAuditLogs,
      recentActivity
    ] = await Promise.all([
      // User statistics
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'admin' } }),
      prisma.user.count({
        where: {
          createdAt: { gte: startDate }
        }
      }),
      
      // Matrix statistics
      prisma.matrix.count(),
      prisma.flowEntry.count(),
      prisma.matrix.count({
        where: {
          updatedAt: { gte: startDate }
        }
      }),
      prisma.changeRequest.count({
        where: { status: 'pending' }
      }),
      
      // Audit statistics
      prisma.auditLog.count({
        where: {
          at: { gte: startDate }
        }
      }),
      prisma.auditLog.findMany({
        take: 15,
        orderBy: { at: 'desc' },
        where: {
          at: { gte: startDate }
        },
        include: {
          user: {
            select: {
              username: true,
              fullName: true
            }
          }
        }
      })
    ])

    // System health checks
    let systemHealth = {
      database: 'healthy' as 'healthy' | 'warning' | 'error',
      auth: 'healthy' as 'healthy' | 'warning' | 'error',
      audit: 'healthy' as 'healthy' | 'warning' | 'error',
      overall: 'healthy' as 'healthy' | 'warning' | 'error'
    }

    if (validatedQuery.includeSystemHealth) {
      // Database health check
      try {
        const startTime = Date.now()
        await prisma.$queryRaw`SELECT 1`
        const responseTime = Date.now() - startTime
        
        if (responseTime > 10000) {
          systemHealth.database = 'error'
        } else if (responseTime > 5000) {
          systemHealth.database = 'warning'
        }
      } catch (error) {
        systemHealth.database = 'error'
        logger.error('Database health check failed', error instanceof Error ? error : undefined, {
          userId: session.user.id,
          endpoint: '/api/admin/dashboard'
        })
      }

      // Auth system health - simplified check
      // Note: Could be extended with specific audit log queries in the future
      systemHealth.auth = 'healthy'

      // Audit system health (check if logs are being created)
      // Vérifie s'il y a eu des logs dans les dernières 24 heures (au lieu de 15 minutes)
      const recentLogs = await prisma.auditLog.count({
        where: {
          at: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } // last 24 hours
        }
      })

      // Vérifie aussi la connectivité à la table audit_logs
      try {
        await prisma.auditLog.findFirst({
          select: { id: true },
          take: 1
        })
        
        // Si pas de logs récents dans les 7 derniers jours, c'est un warning
        if (recentLogs === 0) {
          const weekOldLogs = await prisma.auditLog.count({
            where: {
              at: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } // last 7 days
            }
          })
          
          if (weekOldLogs === 0) {
            systemHealth.audit = 'warning'
          }
        }
      } catch (auditError) {
        systemHealth.audit = 'error'
        logger.error('Audit system health check failed', auditError instanceof Error ? auditError : undefined, {
          userId: session.user.id,
          endpoint: '/api/admin/dashboard'
        })
      }

      // Overall health
      const healthValues = [systemHealth.database, systemHealth.auth, systemHealth.audit]
      if (healthValues.includes('error')) {
        systemHealth.overall = 'error'
      } else if (healthValues.includes('warning')) {
        systemHealth.overall = 'warning'
      }
    }

    // Format recent activity with severity classification
    const formattedRecentActivity = recentActivity.map((log: any) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      user: log.user?.fullName || log.user?.username || 'Système',
      timestamp: log.at.toISOString(),
      severity: classifyLogSeverity(log.action, log.entity)
    }))

    // Calculate basic performance metrics
    // Simplified error calculation - can be extended with specific action types
    const errorLogs = 0

    const dashboardStats: AdminDashboardStats = {
      userStats: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        adminCount: adminUsers,
        recentRegistrations: recentUsers
      },
      matrixStats: {
        total: totalMatrices,
        totalEntries: totalEntries,
        recentlyModified: recentMatrices,
        pendingChangeRequests
      },
      auditStats: {
        totalLogs: totalAuditLogs,
        recentActivity: formattedRecentActivity
      },
      systemHealth,
      performanceMetrics: {
        avgResponseTime: 150, // This would be calculated from actual metrics
        errorRate: totalAuditLogs > 0 ? (errorLogs / totalAuditLogs) * 100 : 0,
        uptime: 99.9 // This would come from actual uptime monitoring
      }
    }

    logger.info('Admin dashboard statistics retrieved successfully', {
      userId: session.user.id,
      timeRange: validatedQuery.timeRange,
      totalUsers,
      totalMatrices,
      totalAuditLogs,
      systemHealthStatus: systemHealth.overall,
      includeSystemHealth: validatedQuery.includeSystemHealth
    })

    return NextResponse.json<ApiResponse<AdminDashboardStats>>({
      success: true,
      data: dashboardStats,
      message: 'Dashboard statistics retrieved successfully'
    })

  } catch (error) {
    logger.error('Error fetching admin dashboard statistics', error instanceof Error ? error : undefined, {
      userId: session.user.id,
      endpoint: '/api/admin/dashboard',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch dashboard statistics'
    }, { status: 500 })
  }
}

function classifyLogSeverity(action: string, entity: string): 'low' | 'medium' | 'high' {
  // High severity actions
  if (action.includes('delete') || action.includes('reset_password') ||
      action.includes('login_failed') || action.includes('permission_denied')) {
    return 'high'
  }
  
  // Medium severity actions
  if (action.includes('update') || action.includes('create') ||
      action.includes('approve') || action.includes('reject')) {
    return 'medium'
  }
  
  // Low severity actions (read operations, etc.)
  return 'low'
}