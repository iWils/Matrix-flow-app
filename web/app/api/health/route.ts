import { NextRequest, NextResponse } from 'next/server'
import { HealthCheckManager } from '@/lib/monitoring/healthCheck'
import { auth } from '@/auth'

// Health check simple pour les load balancers
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const detailed = url.searchParams.get('detailed') === 'true'
    
    if (!detailed) {
      // Health check rapide pour les load balancers
      const simpleHealth = await HealthCheckManager.getSimpleHealth()
      
      return NextResponse.json(simpleHealth, {
        status: simpleHealth.status === 'ok' ? 200 : 503,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // Health check détaillé - nécessite authentification admin
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      )
    }

    const systemHealth = await HealthCheckManager.checkSystemHealth()
    
    const statusCode = systemHealth.overall.status === 'healthy' ? 200 :
                      systemHealth.overall.status === 'degraded' ? 200 : 503

    return NextResponse.json(systemHealth, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    )
  }
}

// Endpoint pour obtenir les métriques de base
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      )
    }

    const { action } = await request.json()

    switch (action) {
      case 'metrics': {
        const metrics = {
          uptime: HealthCheckManager.getUptime(),
          memory: HealthCheckManager.getMemoryStats(),
          timestamp: new Date().toISOString(),
          pid: process.pid,
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch
        }
        
        return NextResponse.json(metrics)
      }

      case 'quick-check': {
        const quickHealth = await Promise.all([
          HealthCheckManager.checkDatabase(),
          HealthCheckManager.checkRedis()
        ])

        return NextResponse.json({
          database: quickHealth[0],
          redis: quickHealth[1],
          timestamp: new Date().toISOString()
        })
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Health metrics error:', error)
    
    return NextResponse.json(
      { error: 'Failed to get metrics' },
      { status: 500 }
    )
  }
}