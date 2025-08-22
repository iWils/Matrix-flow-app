import { logger } from './logger'
import { auditLog } from './audit'

type NotificationType = 'backup_success' | 'backup_failure' | 'restore_success' | 'restore_failure' | 'scheduler_error'

interface NotificationData {
  type: NotificationType
  title: string
  message: string
  details?: Record<string, unknown>
  userId?: number
}

interface EmailNotification extends NotificationData {
  recipient: string
  priority: 'low' | 'medium' | 'high'
}

class NotificationService {
  private notifications: NotificationData[] = []
  private maxNotifications = 100

  // Store notification in memory (could be extended to database)
  private addNotification(notification: NotificationData): void {
    this.notifications.unshift({
      ...notification,
      timestamp: new Date().toISOString()
    } as NotificationData & { timestamp: string })

    // Keep only recent notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications)
    }
  }

  public async notifyBackupSuccess(data: {
    backupPath: string
    size: number
    duration?: number
    automatic?: boolean
    userId?: number
  }): Promise<void> {
    const notification: NotificationData = {
      type: 'backup_success',
      title: 'Backup Completed Successfully',
      message: `Database backup created successfully${data.automatic ? ' (automatic)' : ''}`,
      details: {
        backupPath: data.backupPath,
        size: data.size,
        duration: data.duration,
        automatic: data.automatic || false,
        sizeFormatted: this.formatFileSize(data.size)
      },
      userId: data.userId
    }

    this.addNotification(notification)
    
    logger.info('Backup success notification created', {
      type: notification.type,
      automatic: data.automatic,
      size: data.size
    })

    // Could send email notification here
    // await this.sendEmailNotification(...)
  }

  public async notifyBackupFailure(data: {
    error: string
    automatic?: boolean
    userId?: number
  }): Promise<void> {
    const notification: NotificationData = {
      type: 'backup_failure',
      title: 'Backup Failed',
      message: `Database backup failed${data.automatic ? ' (automatic)' : ''}: ${data.error}`,
      details: {
        error: data.error,
        automatic: data.automatic || false
      },
      userId: data.userId
    }

    this.addNotification(notification)
    
    logger.error('Backup failure notification created', undefined, {
      type: notification.type,
      automatic: data.automatic,
      error: data.error
    })

    // Send high priority email for backup failures
    if (data.automatic) {
      await this.sendCriticalAlert({
        title: notification.title,
        message: notification.message,
        details: notification.details
      })
    }
  }

  public async notifyRestoreSuccess(data: {
    backupPath: string
    duration?: number
    userId?: number
  }): Promise<void> {
    const notification: NotificationData = {
      type: 'restore_success',
      title: 'Database Restore Completed',
      message: `Database successfully restored from backup`,
      details: {
        backupPath: data.backupPath,
        duration: data.duration
      },
      userId: data.userId
    }

    this.addNotification(notification)
    
    logger.info('Restore success notification created', {
      type: notification.type,
      backupPath: data.backupPath
    })

    // Critical action - log in audit
    if (data.userId) {
      await auditLog({
        userId: data.userId,
        entity: 'SystemNotification',
        entityId: 0,
        action: 'create',
        changes: {
          type: 'restore_success',
          backupPath: data.backupPath,
          timestamp: new Date().toISOString()
        }
      })
    }
  }

  public async notifyRestoreFailure(data: {
    backupPath: string
    error: string
    userId?: number
  }): Promise<void> {
    const notification: NotificationData = {
      type: 'restore_failure',
      title: 'Database Restore Failed',
      message: `Failed to restore database: ${data.error}`,
      details: {
        backupPath: data.backupPath,
        error: data.error
      },
      userId: data.userId
    }

    this.addNotification(notification)
    
    logger.error('Restore failure notification created', undefined, {
      type: notification.type,
      backupPath: data.backupPath,
      error: data.error
    })

    // Critical action - send alert
    await this.sendCriticalAlert({
      title: notification.title,
      message: notification.message,
      details: notification.details
    })
  }

  public async notifySchedulerError(data: {
    error: string
    action?: string
  }): Promise<void> {
    const notification: NotificationData = {
      type: 'scheduler_error',
      title: 'Backup Scheduler Error',
      message: `Scheduler error${data.action ? ` during ${data.action}` : ''}: ${data.error}`,
      details: {
        error: data.error,
        action: data.action
      }
    }

    this.addNotification(notification)
    
    logger.error('Scheduler error notification created', undefined, {
      type: notification.type,
      action: data.action,
      error: data.error
    })
  }

  public getRecentNotifications(limit = 20): NotificationData[] {
    return this.notifications.slice(0, limit)
  }

  public getNotificationsByType(type: NotificationType, limit = 10): NotificationData[] {
    return this.notifications
      .filter(n => n.type === type)
      .slice(0, limit)
  }

  public clearNotifications(): void {
    this.notifications = []
    logger.info('All notifications cleared')
  }

  public getNotificationStats(): {
    total: number
    byType: Record<NotificationType, number>
    recent24h: number
  } {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    const byType: Record<NotificationType, number> = {
      backup_success: 0,
      backup_failure: 0,
      restore_success: 0,
      restore_failure: 0,
      scheduler_error: 0
    }

    let recent24h = 0

    this.notifications.forEach(notification => {
      byType[notification.type]++
      
      const timestamp = (notification as NotificationData & { timestamp: string }).timestamp
      if (timestamp && new Date(timestamp) > yesterday) {
        recent24h++
      }
    })

    return {
      total: this.notifications.length,
      byType,
      recent24h
    }
  }

  private async sendCriticalAlert(alert: {
    title: string
    message: string
    details?: Record<string, unknown>
  }): Promise<void> {
    // Log critical alert
    logger.warn('Critical backup system alert', {
      title: alert.title,
      message: alert.message,
      details: alert.details,
      timestamp: new Date().toISOString()
    })

    // Here you could integrate with:
    // - Email service (SMTP)
    // - Slack webhook
    // - Discord webhook
    // - SMS service
    // - Push notifications
    // - etc.

    // Example email integration (would need email settings from database)
    // const emailSettings = await this.getEmailSettings()
    // if (emailSettings.enabled) {
    //   await this.sendEmail({
    //     to: emailSettings.alertEmail,
    //     subject: `[CRITICAL] ${alert.title}`,
    //     body: `${alert.message}\n\nDetails: ${JSON.stringify(alert.details, null, 2)}`
    //   })
    // }
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

// Global notification service instance
export const notificationService = new NotificationService()

// Utility functions for easy usage
export const notifications = {
  backupSuccess: (data: Parameters<NotificationService['notifyBackupSuccess']>[0]) => 
    notificationService.notifyBackupSuccess(data),
  
  backupFailure: (data: Parameters<NotificationService['notifyBackupFailure']>[0]) => 
    notificationService.notifyBackupFailure(data),
  
  restoreSuccess: (data: Parameters<NotificationService['notifyRestoreSuccess']>[0]) => 
    notificationService.notifyRestoreSuccess(data),
  
  restoreFailure: (data: Parameters<NotificationService['notifyRestoreFailure']>[0]) => 
    notificationService.notifyRestoreFailure(data),
  
  schedulerError: (data: Parameters<NotificationService['notifySchedulerError']>[0]) => 
    notificationService.notifySchedulerError(data),
  
  getRecent: (limit?: number) => notificationService.getRecentNotifications(limit),
  
  getStats: () => notificationService.getNotificationStats(),
  
  clear: () => notificationService.clearNotifications()
}