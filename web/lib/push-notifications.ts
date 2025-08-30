import webpush from 'web-push'
import { prisma } from './db'
import { NotificationPreferenceService } from './notification-preferences'

// VAPID keys configuration
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivMjBWEZKNEq6Wt7NCUiIWdNzM1kc3yWWLUAO2V7CbRFOKKZMYkdVb8yMaNMU6zGfzYQj7P8zrHvM',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'P-8srNJXnMO0w8lVKSm9ZfOh9iMYFLdixcN5J_Zrggmo'
}

webpush.setVapidDetails(
  'mailto:admin@matrixflow.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
)

export interface PushNotificationPayload {
  title: string
  body: string
  type?: 'general' | 'change_request' | 'change_approval' | 'security_alert' | 'system_alert' | 'instant_alert'
  url?: string
  icon?: string
  badge?: string
  requireInteraction?: boolean
  tag?: string
  data?: Record<string, any>
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

export interface PushSendResult {
  sent: number
  failed: number
  errors: string[]
  skippedPreferences: number
  skippedQuietHours: number
}

export class PushNotificationService {
  
  /**
   * Send push notification to a specific user
   */
  static async sendToUser(userId: number, payload: PushNotificationPayload): Promise<PushSendResult> {
    return this.sendToUsers([userId], payload)
  }

  /**
   * Send push notification to multiple users
   */
  static async sendToUsers(userIds: number[], payload: PushNotificationPayload): Promise<PushSendResult> {
    const result: PushSendResult = {
      sent: 0,
      failed: 0,
      errors: [],
      skippedPreferences: 0,
      skippedQuietHours: 0
    }

    // Check user preferences and quiet hours for each user
    const validUserIds: number[] = []
    for (const userId of userIds) {
      const check = await NotificationPreferenceService.getNotificationCheck(
        userId, 
        payload.type || 'general'
      )

      if (!check.canSendPush) {
        if (check.isQuietHours) {
          result.skippedQuietHours++
        } else {
          result.skippedPreferences++
        }
        continue
      }

      validUserIds.push(userId)
    }

    if (validUserIds.length === 0) {
      return result
    }

    // Get active push subscriptions for valid users
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: { in: validUserIds },
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            isActive: true
          }
        }
      }
    })

    if (subscriptions.length === 0) {
      return result
    }

    // Prepare notification payload
    const notificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      tag: payload.tag || `matrix-flow-${payload.type || 'general'}`,
      requireInteraction: payload.requireInteraction || this.shouldRequireInteraction(payload.type),
      url: payload.url || '/',
      type: payload.type || 'general',
      timestamp: Date.now(),
      data: payload.data || {},
      actions: payload.actions || this.getDefaultActions(payload.type)
    }

    // Send notifications
    const batchSize = 10
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize)
      
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
            JSON.stringify(notificationPayload),
            {
              TTL: this.getTTL(payload.type),
              urgency: this.getUrgency(payload.type)
            }
          )

          // Update last used timestamp
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastUsed: new Date() }
          }).catch(() => {
            // Ignore update errors
          })

          result.sent++

        } catch (error: any) {
          console.error(`Failed to send push notification to subscription ${subscription.id}:`, error)
          result.failed++

          // Handle subscription errors
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription is no longer valid, deactivate it
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false }
            }).catch(() => {
              // Ignore deactivation errors
            })
            result.errors.push(`Subscription ${subscription.id} deactivated (gone)`)
          } else {
            result.errors.push(`Subscription ${subscription.id}: ${error.message}`)
          }
        }
      })

      await Promise.all(promises)
    }

    return result
  }

  /**
   * Send push notification to all users with push enabled
   */
  static async sendToAllUsers(payload: PushNotificationPayload): Promise<PushSendResult> {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        notificationPrefs: {
          pushEnabled: true
        }
      },
      select: { id: true }
    })

    const userIds = users.map(u => u.id)
    return this.sendToUsers(userIds, payload)
  }

  /**
   * Send change request notification
   */
  static async sendChangeRequestNotification(
    requestId: number,
    matrixName: string,
    requesterName: string,
    actionType: string
  ): Promise<PushSendResult> {
    // Send to admins only
    const admins = await prisma.user.findMany({
      where: {
        role: 'admin',
        isActive: true
      },
      select: { id: true }
    })

    const adminIds = admins.map(u => u.id)

    return this.sendToUsers(adminIds, {
      title: 'Nouvelle demande d\'approbation',
      body: `${requesterName} demande ${actionType} sur "${matrixName}"`,
      type: 'change_request',
      url: `/admin/workflow/${requestId}`,
      requireInteraction: true,
      tag: `change-request-${requestId}`,
      data: {
        requestId,
        matrixName,
        requesterName,
        actionType
      },
      actions: [
        {
          action: 'approve',
          title: 'Approuver',
          icon: '/icons/action-approve.png'
        },
        {
          action: 'view',
          title: 'Voir',
          icon: '/icons/action-view.png'
        }
      ]
    })
  }

  /**
   * Send change approval/rejection notification
   */
  static async sendChangeApprovalNotification(
    userId: number,
    matrixName: string,
    actionType: string,
    approved: boolean,
    approverName: string
  ): Promise<PushSendResult> {
    return this.sendToUser(userId, {
      title: approved ? 'Demande approuvée' : 'Demande rejetée',
      body: `Votre demande ${actionType} sur "${matrixName}" a été ${approved ? 'approuvée' : 'rejetée'} par ${approverName}`,
      type: 'change_approval',
      url: '/matrices',
      tag: `change-approval-${Date.now()}`,
      data: {
        matrixName,
        actionType,
        approved,
        approverName
      }
    })
  }

  /**
   * Send security alert notification
   */
  static async sendSecurityAlert(
    title: string,
    message: string,
    details?: Record<string, any>
  ): Promise<PushSendResult> {
    // Send to admins only
    const admins = await prisma.user.findMany({
      where: {
        role: 'admin',
        isActive: true
      },
      select: { id: true }
    })

    const adminIds = admins.map(u => u.id)

    return this.sendToUsers(adminIds, {
      title: `🚨 ${title}`,
      body: message,
      type: 'security_alert',
      url: '/admin/audit',
      requireInteraction: true,
      tag: 'security-alert',
      data: details,
      actions: [
        {
          action: 'view',
          title: 'Vérifier',
          icon: '/icons/action-security.png'
        }
      ]
    })
  }

  /**
   * Send system alert notification
   */
  static async sendSystemAlert(
    title: string,
    message: string,
    details?: Record<string, any>
  ): Promise<PushSendResult> {
    // Send to admins only
    const admins = await prisma.user.findMany({
      where: {
        role: 'admin',
        isActive: true
      },
      select: { id: true }
    })

    const adminIds = admins.map(u => u.id)

    return this.sendToUsers(adminIds, {
      title: `⚠️ ${title}`,
      body: message,
      type: 'system_alert',
      url: '/admin/system',
      tag: 'system-alert',
      data: details
    })
  }

  /**
   * Test push notification for a user
   */
  static async sendTestNotification(userId: number): Promise<PushSendResult> {
    return this.sendToUser(userId, {
      title: 'Test - Matrix Flow',
      body: 'Ceci est un test de notification push. Votre configuration fonctionne correctement !',
      type: 'general',
      url: '/profile/notifications',
      tag: 'test-notification',
      data: {
        test: true,
        timestamp: Date.now()
      }
    })
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  static getVapidPublicKey(): string {
    return vapidKeys.publicKey
  }

  /**
   * Get default actions based on notification type
   */
  private static getDefaultActions(type?: string): Array<{ action: string; title: string; icon?: string }> {
    switch (type) {
      case 'change_request':
        return [
          { action: 'approve', title: 'Approuver', icon: '/icons/action-approve.png' },
          { action: 'view', title: 'Voir', icon: '/icons/action-view.png' }
        ]
      case 'security_alert':
        return [
          { action: 'view', title: 'Vérifier', icon: '/icons/action-security.png' }
        ]
      default:
        return []
    }
  }

  /**
   * Determine if notification should require user interaction
   */
  private static shouldRequireInteraction(type?: string): boolean {
    return type === 'change_request' || type === 'security_alert'
  }

  /**
   * Get TTL (Time To Live) based on notification type
   */
  private static getTTL(type?: string): number {
    switch (type) {
      case 'instant_alert':
        return 60 * 60 // 1 hour
      case 'security_alert':
        return 6 * 60 * 60 // 6 hours
      case 'change_request':
        return 12 * 60 * 60 // 12 hours
      default:
        return 24 * 60 * 60 // 24 hours
    }
  }

  /**
   * Get urgency level based on notification type
   */
  private static getUrgency(type?: string): 'very-low' | 'low' | 'normal' | 'high' {
    switch (type) {
      case 'security_alert':
      case 'instant_alert':
        return 'high'
      case 'change_request':
      case 'system_alert':
        return 'normal'
      default:
        return 'low'
    }
  }

  /**
   * Get statistics about push subscriptions
   */
  static async getStats(): Promise<{
    totalUsers: number
    usersWithPushEnabled: number
    activeSubscriptions: number
    inactiveSubscriptions: number
    recentActivity: number
  }> {
    const [totalUsers, usersWithPushEnabled, subscriptionStats, recentActivity] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      
      prisma.user.count({
        where: {
          isActive: true,
          notificationPrefs: { pushEnabled: true }
        }
      }),
      
      prisma.pushSubscription.groupBy({
        by: ['isActive'],
        _count: true
      }),
      
      prisma.pushSubscription.count({
        where: {
          isActive: true,
          lastUsed: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ])

    const activeSubscriptions = subscriptionStats.find(s => s.isActive)?._count || 0
    const inactiveSubscriptions = subscriptionStats.find(s => !s.isActive)?._count || 0

    return {
      totalUsers,
      usersWithPushEnabled,
      activeSubscriptions,
      inactiveSubscriptions,
      recentActivity
    }
  }
}

export default PushNotificationService