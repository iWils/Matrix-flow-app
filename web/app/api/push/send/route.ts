import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import webpush from 'web-push'

// Configure web-push (these should be in environment variables)
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivMjBWEZKNEq6Wt7NCUiIWdNzM1kc3yWWLUAO2V7CbRFOKKZMYkdVb8yMaNMU6zGfzYQj7P8zrHvM',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'P-8srNJXnMO0w8lVKSm9ZfOh9iMYFLdixcN5J_Zrggmo'
}

webpush.setVapidDetails(
  'mailto:admin@matrixflow.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

const SendNotificationSchema = z.object({
  title: z.string(),
  body: z.string(),
  type: z.enum(['general', 'change_request', 'change_approval', 'security_alert', 'system_alert']).optional(),
  url: z.string().optional(),
  icon: z.string().optional(),
  badge: z.string().optional(),
  requireInteraction: z.boolean().optional(),
  userId: z.number().optional(), // If specified, send only to this user
  userIds: z.array(z.number()).optional(), // If specified, send to these users
  tag: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can send push notifications
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const notificationData = SendNotificationSchema.parse(body)

    // Determine target users
    let targetUserIds: number[] = []

    if (notificationData.userId) {
      targetUserIds = [notificationData.userId]
    } else if (notificationData.userIds && notificationData.userIds.length > 0) {
      targetUserIds = notificationData.userIds
    } else {
      // Send to all users with push enabled
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          notificationPrefs: {
            pushEnabled: true
          }
        },
        select: { id: true }
      })
      targetUserIds = users.map(u => u.id)
    }

    if (targetUserIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No target users found',
        sent: 0
      })
    }

    // Get push subscriptions for target users
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: targetUserIds },
        isActive: true,
        user: {
          notificationPrefs: {
            pushEnabled: true
          }
        }
      },
      include: {
        user: {
          include: {
            notificationPrefs: true
          }
        }
      }
    })

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active push subscriptions found',
        sent: 0
      })
    }

    // Filter subscriptions based on notification type preferences
    const filteredSubscriptions = subscriptions.filter(subscription => {
      const prefs = subscription.user.notificationPrefs
      if (!prefs) return false

      const type = notificationData.type || 'general'
      switch (type) {
        case 'change_request':
          return prefs.pushChangeRequests
        case 'change_approval':
          return prefs.pushChangeApprovals
        case 'security_alert':
          return prefs.pushSecurityAlerts
        case 'system_alert':
          return prefs.pushSystemAlerts
        default:
          return true
      }
    })

    // Prepare notification payload
    const payload = {
      title: notificationData.title,
      body: notificationData.body,
      icon: notificationData.icon || '/icons/icon-192x192.png',
      badge: notificationData.badge || '/icons/badge-72x72.png',
      tag: notificationData.tag || `matrix-flow-${notificationData.type || 'general'}`,
      requireInteraction: notificationData.requireInteraction || false,
      url: notificationData.url || '/',
      type: notificationData.type || 'general',
      timestamp: Date.now(),
      data: notificationData.data || {}
    }

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Send notifications in batches to avoid overwhelming the service
    const batchSize = 10
    for (let i = 0; i < filteredSubscriptions.length; i += batchSize) {
      const batch = filteredSubscriptions.slice(i, i + batchSize)
      
      const promises = batch.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          }

          await webpush.sendNotification(
            pushSubscription,
            JSON.stringify(payload),
            {
              TTL: 24 * 60 * 60, // 24 hours
              urgency: notificationData.type === 'security_alert' ? 'high' : 'normal'
            }
          )

          // Update last used timestamp
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastUsed: new Date() }
          })

          results.sent++
        } catch (error: any) {
          console.error('Failed to send push notification:', error)
          results.failed++

          // Handle subscription errors
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription is no longer valid, deactivate it
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false }
            })
            results.errors.push(`Subscription ${subscription.id} deactivated (gone)`)
          } else {
            results.errors.push(`Subscription ${subscription.id}: ${error.message}`)
          }
        }
      })

      // Wait for batch to complete before processing next batch
      await Promise.all(promises)
    }

    // Log the push notification send
    await prisma.auditLog.create({
      data: {
        userId: parseInt(session.user.id),
        entity: 'push_notification',
        entityId: 0,
        action: 'create',
        changes: {
          action: 'push_notification_sent',
          title: notificationData.title,
          type: notificationData.type || 'general',
          targetUsers: targetUserIds.length,
          sent: results.sent,
          failed: results.failed
        },
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: `Push notifications sent: ${results.sent} successful, ${results.failed} failed`,
      results
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid notification data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error sending push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to send push notifications' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get push notification statistics
    const stats = await prisma.pushSubscription.groupBy({
      by: ['isActive'],
      _count: true,
      where: {
        user: {
          isActive: true
        }
      }
    })

    const totalUsers = await prisma.user.count({
      where: { isActive: true }
    })

    const usersWithPushEnabled = await prisma.user.count({
      where: {
        isActive: true,
        notificationPrefs: {
          pushEnabled: true
        }
      }
    })

    const activeSubscriptions = stats.find(s => s.isActive)?._count || 0
    const inactiveSubscriptions = stats.find(s => !s.isActive)?._count || 0

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        usersWithPushEnabled,
        activeSubscriptions,
        inactiveSubscriptions,
        vapidPublicKey: vapidKeys.publicKey
      }
    })

  } catch (error) {
    console.error('Error fetching push notification stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch push notification stats' },
      { status: 500 }
    )
  }
}