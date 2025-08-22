import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { notificationService } from '@/lib/notifications'
import { ApiResponse } from '@/types'

// GET: Retrieve notifications
export async function GET(request: NextRequest) {
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
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const type = url.searchParams.get('type')
    const stats = url.searchParams.get('stats') === 'true'

    if (stats) {
      const notificationStats = notificationService.getNotificationStats()
      return NextResponse.json<ApiResponse<typeof notificationStats>>({
        success: true,
        data: notificationStats,
        message: 'Notification statistics retrieved successfully'
      })
    }

    let notifications
    if (type) {
      notifications = notificationService.getNotificationsByType(type as any, limit)
    } else {
      notifications = notificationService.getRecentNotifications(limit)
    }

    return NextResponse.json<ApiResponse<typeof notifications>>({
      success: true,
      data: notifications,
      message: 'Notifications retrieved successfully'
    })

  } catch (error) {
    logger.error('Error retrieving notifications', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/notifications',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to retrieve notifications'
    }, { status: 500 })
  }
}

// DELETE: Clear notifications
export async function DELETE() {
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
    notificationService.clearNotifications()

    logger.info('Notifications cleared by admin', {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/notifications',
      method: 'DELETE'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'All notifications cleared successfully'
    })

  } catch (error) {
    logger.error('Error clearing notifications', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/notifications',
      method: 'DELETE'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to clear notifications'
    }, { status: 500 })
  }
}