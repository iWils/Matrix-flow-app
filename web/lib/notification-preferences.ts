import { prisma } from './db'
import { NotificationPreference } from '@prisma/client'

export interface NotificationCheck {
  canSendEmail: boolean
  canSendPush: boolean
  canSendInApp: boolean
  canSendWebhook: boolean
  isQuietHours: boolean
}

export class NotificationPreferenceService {
  
  /**
   * Get user's notification preferences, creating defaults if none exist
   */
  static async getUserPreferences(userId: number): Promise<NotificationPreference> {
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    })

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: { userId }
      })
    }

    return preferences
  }

  /**
   * Check if user can receive a specific type of notification
   */
  static async canReceiveNotification(
    userId: number, 
    notificationType: string,
    channel: 'email' | 'push' | 'inApp' | 'webhook' = 'email'
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId)
    
    // Check if channel is globally enabled
    const channelEnabled = this.isChannelEnabled(preferences, channel)
    if (!channelEnabled) return false

    // Check quiet hours
    if (this.isQuietHours(preferences)) {
      // Only allow critical notifications during quiet hours
      return ['security_alert', 'system_alert'].includes(notificationType)
    }

    // Check specific notification type
    return this.isNotificationTypeEnabled(preferences, notificationType, channel)
  }

  /**
   * Get notification check result for all channels
   */
  static async getNotificationCheck(
    userId: number,
    notificationType: string
  ): Promise<NotificationCheck> {
    const preferences = await this.getUserPreferences(userId)
    const isQuietHours = this.isQuietHours(preferences)

    return {
      canSendEmail: this.canSendForChannel(preferences, notificationType, 'email', isQuietHours),
      canSendPush: this.canSendForChannel(preferences, notificationType, 'push', isQuietHours),
      canSendInApp: this.canSendForChannel(preferences, notificationType, 'inApp', isQuietHours),
      canSendWebhook: this.canSendForChannel(preferences, notificationType, 'webhook', isQuietHours),
      isQuietHours
    }
  }

  private static canSendForChannel(
    preferences: NotificationPreference,
    notificationType: string,
    channel: 'email' | 'push' | 'inApp' | 'webhook',
    isQuietHours: boolean
  ): boolean {
    // Channel must be enabled
    if (!this.isChannelEnabled(preferences, channel)) return false

    // During quiet hours, only critical notifications
    if (isQuietHours && !['security_alert', 'system_alert'].includes(notificationType)) {
      return false
    }

    // Check specific notification type
    return this.isNotificationTypeEnabled(preferences, notificationType, channel)
  }

  private static isChannelEnabled(
    preferences: NotificationPreference,
    channel: 'email' | 'push' | 'inApp' | 'webhook'
  ): boolean {
    switch (channel) {
      case 'email':
        return preferences.emailEnabled
      case 'push':
        return preferences.pushEnabled
      case 'inApp':
        return preferences.inAppEnabled
      case 'webhook':
        return preferences.webhookEnabled && !!preferences.webhookUrl
      default:
        return false
    }
  }

  private static isNotificationTypeEnabled(
    preferences: NotificationPreference,
    notificationType: string,
    channel: 'email' | 'push' | 'inApp' | 'webhook'
  ): boolean {
    const prefix = channel === 'inApp' ? 'inApp' : channel

    switch (notificationType) {
      case 'change_request':
        return preferences[`${prefix}ChangeRequests` as keyof NotificationPreference] as boolean
      case 'change_approval':
        return preferences[`${prefix}ChangeApprovals` as keyof NotificationPreference] as boolean
      case 'security_alert':
        return preferences[`${prefix}SecurityAlerts` as keyof NotificationPreference] as boolean
      case 'system_alert':
        return preferences[`${prefix}SystemAlerts` as keyof NotificationPreference] as boolean
      case 'daily_digest':
        return channel === 'email' ? preferences.emailDailyDigest : false
      case 'weekly_report':
        return channel === 'email' ? preferences.emailWeeklyReport : false
      case 'instant_alert':
        return channel === 'push' ? preferences.pushInstantAlerts : false
      default:
        return false
    }
  }

  /**
   * Check if current time is within user's quiet hours
   */
  private static isQuietHours(preferences: NotificationPreference): boolean {
    if (!preferences.quietHoursEnabled || !preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false
    }

    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    const start = preferences.quietHoursStart
    const end = preferences.quietHoursEnd

    // Handle case where quiet hours span midnight
    if (start > end) {
      return currentTime >= start || currentTime <= end
    }

    return currentTime >= start && currentTime <= end
  }

  /**
   * Get users who should receive daily digest
   */
  static async getUsersForDailyDigest(): Promise<Array<{
    userId: number
    email: string
    digestTime: string
  }>> {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        email: { not: null },
        notificationPrefs: {
          emailEnabled: true,
          emailDailyDigest: true,
          digestFrequency: 'daily',
          digestTime: currentTime
        }
      },
      select: {
        id: true,
        email: true,
        notificationPrefs: {
          select: {
            digestTime: true
          }
        }
      }
    })

    return users.map(user => ({
      userId: user.id,
      email: user.email!,
      digestTime: user.notificationPrefs?.digestTime || '09:00'
    }))
  }

  /**
   * Get users who should receive weekly report
   */
  static async getUsersForWeeklyReport(): Promise<Array<{
    userId: number
    email: string
    digestTime: string
  }>> {
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    const dayOfWeek = now.getDay() // 0 = Sunday, 1 = Monday, etc.

    // Send weekly reports on Mondays
    if (dayOfWeek !== 1) return []

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        email: { not: null },
        notificationPrefs: {
          emailEnabled: true,
          emailWeeklyReport: true,
          digestFrequency: 'weekly',
          digestTime: currentTime
        }
      },
      select: {
        id: true,
        email: true,
        notificationPrefs: {
          select: {
            digestTime: true
          }
        }
      }
    })

    return users.map(user => ({
      userId: user.id,
      email: user.email!,
      digestTime: user.notificationPrefs?.digestTime || '09:00'
    }))
  }

  /**
   * Get webhooks that should receive specific event type
   */
  static async getWebhooksForEvent(eventType: string): Promise<Array<{
    userId: number
    webhookUrl: string
    webhookSecret?: string
  }>> {
    const preferences = await prisma.notificationPreference.findMany({
      where: {
        webhookEnabled: true,
        webhookUrl: { not: null },
        user: { isActive: true }
      },
      include: {
        user: {
          select: { id: true }
        }
      }
    })

    return preferences
      .filter(pref => {
        const events = Array.isArray(pref.webhookEvents) 
          ? pref.webhookEvents as string[]
          : []
        return events.length === 0 || events.includes(eventType) || events.includes('*')
      })
      .map(pref => ({
        userId: pref.user.id,
        webhookUrl: pref.webhookUrl!,
        webhookSecret: pref.webhookSecret || undefined
      }))
  }

  /**
   * Update last notification sent timestamp (for rate limiting)
   */
  static async updateLastNotificationSent(
    userId: number,
    notificationType: string,
    channel: string
  ): Promise<void> {
    // Could be extended to track notification frequency
    // For now, just log to audit
    await prisma.auditLog.create({
      data: {
        userId,
        entity: 'notification',
        entityId: userId,
        action: 'create',
        changes: {
          notification_type: notificationType,
          channel,
          sent_at: new Date().toISOString()
        }
      }
    }).catch(() => {
      // Don't fail notification sending if audit logging fails
    })
  }
}

export default NotificationPreferenceService