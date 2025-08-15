import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Statistiques des utilisateurs
    const totalUsers = await prisma.user.count()
    const activeUsers = await prisma.user.count({
      where: { isActive: true }
    })

    // Statistiques des matrices
    const totalMatrices = await prisma.matrix.count()

    // Statistiques des logs d'audit (dernières 24h)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    
    const totalAuditLogs = await prisma.auditLog.count({
      where: {
        at: {
          gte: yesterday
        }
      }
    })

    // Activité récente (derniers 10 logs)
    const recentActivity = await prisma.auditLog.findMany({
      take: 10,
      orderBy: { at: 'desc' },
      include: {
        user: {
          select: {
            username: true,
            fullName: true
          }
        }
      }
    })

    // État du système (simulation basique)
    let systemHealth: {
      database: 'healthy' | 'warning' | 'error'
      auth: 'healthy' | 'warning' | 'error'
      audit: 'healthy' | 'warning' | 'error'
    } = {
      database: 'healthy',
      auth: 'healthy',
      audit: 'healthy'
    }

    // Vérification basique de la santé de la base de données
    try {
      await prisma.$queryRaw`SELECT 1`
    } catch (error) {
      systemHealth.database = 'error'
    }

    const dashboardStats = {
      totalUsers,
      activeUsers,
      totalMatrices,
      totalAuditLogs,
      recentActivity: recentActivity.map(log => ({
        id: log.id,
        action: log.action,
        entity: log.entity,
        user: log.user?.fullName || log.user?.username || 'Système',
        timestamp: log.at.toISOString()
      })),
      systemHealth
    }

    return NextResponse.json(dashboardStats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}