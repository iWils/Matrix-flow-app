import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { backupScheduler } from '@/lib/backup-scheduler'
import { ApiResponse } from '@/types'

// GET: Get scheduler status
export async function GET() {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    const status = await backupScheduler.getStatus()
    
    return NextResponse.json<ApiResponse<typeof status>>({
      success: true,
      data: status,
      message: 'Scheduler status retrieved successfully'
    })
  } catch (error) {
    logger.error('Error getting backup scheduler status', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup/scheduler',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to get scheduler status'
    }, { status: 500 })
  }
}

// POST: Control scheduler (start/stop/restart)
export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { action } = body

    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid action. Must be: start, stop, or restart'
      }, { status: 400 })
    }

    logger.info('Backup scheduler action requested', {
      userId: parseInt(session.user.id as string),
      action,
      endpoint: '/api/admin/system/backup/scheduler',
      method: 'POST'
    })

    switch (action) {
      case 'start':
      case 'restart':
        await backupScheduler.restartScheduler()
        break
      case 'stop':
        backupScheduler.stopScheduler()
        break
    }

    const status = await backupScheduler.getStatus()

    return NextResponse.json<ApiResponse<typeof status>>({
      success: true,
      data: status,
      message: `Scheduler ${action} completed successfully`
    })

  } catch (error) {
    logger.error('Error controlling backup scheduler', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup/scheduler',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to control scheduler'
    }, { status: 500 })
  }
}