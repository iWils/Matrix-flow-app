import { describe, test, expect, beforeEach, vi } from 'vitest'
import { notifications, notificationService } from '../lib/notifications'

// Mock the logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn()
  }
}))

// Mock the audit function
vi.mock('../lib/audit', () => ({
  auditLog: vi.fn()
}))

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear all notifications before each test
    notifications.clear()
  })

  describe('notifyBackupSuccess', () => {
    test('should create backup success notification', async () => {
      const data = {
        backupPath: '/tmp/backup.sql',
        size: 1024000,
        duration: 5000,
        automatic: false,
        userId: 1
      }

      await notifications.backupSuccess(data)
      
      const recent = notifications.getRecent(1)
      expect(recent).toHaveLength(1)
      
      const notification = recent[0]
      expect(notification.type).toBe('backup_success')
      expect(notification.title).toBe('Backup Completed Successfully')
      expect(notification.message).toContain('Database backup created successfully')
      expect(notification.details?.backupPath).toBe(data.backupPath)
      expect(notification.details?.size).toBe(data.size)
      expect(notification.details?.duration).toBe(data.duration)
      expect(notification.details?.automatic).toBe(false)
      expect(notification.details?.sizeFormatted).toBe('1000 KB')
      expect(notification.userId).toBe(data.userId)
    })

    test('should handle automatic backup success', async () => {
      const data = {
        backupPath: '/tmp/backup.sql',
        size: 1024,
        automatic: true
      }

      await notifications.backupSuccess(data)
      
      const recent = notifications.getRecent(1)
      const notification = recent[0]
      expect(notification.message).toContain('(automatic)')
      expect(notification.details?.automatic).toBe(true)
    })

    test('should format file sizes correctly', async () => {
      const testCases = [
        { size: 0, expected: '0 Bytes' },
        { size: 500, expected: '500 Bytes' },
        { size: 1024, expected: '1 KB' },
        { size: 1048576, expected: '1 MB' },
        { size: 1073741824, expected: '1 GB' }
      ]

      for (const { size, expected } of testCases) {
        await notifications.backupSuccess({ backupPath: '/tmp/test', size })
        const recent = notifications.getRecent(1)
        expect(recent[0].details?.sizeFormatted).toBe(expected)
        notifications.clear()
      }
    })
  })

  describe('notifyBackupFailure', () => {
    test('should create backup failure notification', async () => {
      const data = {
        error: 'Database connection failed',
        automatic: false,
        userId: 1
      }

      await notifications.backupFailure(data)
      
      const recent = notifications.getRecent(1)
      expect(recent).toHaveLength(1)
      
      const notification = recent[0]
      expect(notification.type).toBe('backup_failure')
      expect(notification.title).toBe('Backup Failed')
      expect(notification.message).toContain('Database backup failed')
      expect(notification.message).toContain(data.error)
      expect(notification.details?.error).toBe(data.error)
      expect(notification.details?.automatic).toBe(false)
      expect(notification.userId).toBe(data.userId)
    })

    test('should handle automatic backup failure', async () => {
      const data = {
        error: 'Disk full',
        automatic: true
      }

      await notifications.backupFailure(data)
      
      const recent = notifications.getRecent(1)
      const notification = recent[0]
      expect(notification.message).toContain('(automatic)')
      expect(notification.details?.automatic).toBe(true)
    })
  })

  describe('notifyRestoreSuccess', () => {
    test('should create restore success notification', async () => {
      const data = {
        backupPath: '/tmp/backup.sql',
        duration: 3000,
        userId: 1
      }

      await notifications.restoreSuccess(data)
      
      const recent = notifications.getRecent(1)
      expect(recent).toHaveLength(1)
      
      const notification = recent[0]
      expect(notification.type).toBe('restore_success')
      expect(notification.title).toBe('Database Restore Completed')
      expect(notification.message).toBe('Database successfully restored from backup')
      expect(notification.details?.backupPath).toBe(data.backupPath)
      expect(notification.details?.duration).toBe(data.duration)
      expect(notification.userId).toBe(data.userId)
    })
  })

  describe('notifyRestoreFailure', () => {
    test('should create restore failure notification', async () => {
      const data = {
        backupPath: '/tmp/backup.sql',
        error: 'Corrupted backup file',
        userId: 1
      }

      await notifications.restoreFailure(data)
      
      const recent = notifications.getRecent(1)
      expect(recent).toHaveLength(1)
      
      const notification = recent[0]
      expect(notification.type).toBe('restore_failure')
      expect(notification.title).toBe('Database Restore Failed')
      expect(notification.message).toContain('Failed to restore database')
      expect(notification.message).toContain(data.error)
      expect(notification.details?.backupPath).toBe(data.backupPath)
      expect(notification.details?.error).toBe(data.error)
      expect(notification.userId).toBe(data.userId)
    })
  })

  describe('notifySchedulerError', () => {
    test('should create scheduler error notification', async () => {
      const data = {
        error: 'Cron job failed',
        action: 'daily backup'
      }

      await notifications.schedulerError(data)
      
      const recent = notifications.getRecent(1)
      expect(recent).toHaveLength(1)
      
      const notification = recent[0]
      expect(notification.type).toBe('scheduler_error')
      expect(notification.title).toBe('Backup Scheduler Error')
      expect(notification.message).toContain('Scheduler error during daily backup')
      expect(notification.message).toContain(data.error)
      expect(notification.details?.error).toBe(data.error)
      expect(notification.details?.action).toBe(data.action)
    })

    test('should handle scheduler error without action', async () => {
      const data = {
        error: 'Unknown scheduler error'
      }

      await notifications.schedulerError(data)
      
      const recent = notifications.getRecent(1)
      const notification = recent[0]
      expect(notification.message).not.toContain('during')
      expect(notification.details?.action).toBeUndefined()
    })
  })

  describe('getRecentNotifications', () => {
    test('should return recent notifications in correct order', async () => {
      // Create multiple notifications
      await notifications.backupSuccess({ backupPath: '/tmp/1', size: 100 })
      await new Promise(resolve => setTimeout(resolve, 1)) // Ensure different timestamps
      await notifications.backupFailure({ error: 'test error' })
      await new Promise(resolve => setTimeout(resolve, 1))
      await notifications.schedulerError({ error: 'scheduler error' })

      const recent = notifications.getRecent(3)
      expect(recent).toHaveLength(3)
      
      // Should be in reverse chronological order (newest first)
      expect(recent[0].type).toBe('scheduler_error')
      expect(recent[1].type).toBe('backup_failure')
      expect(recent[2].type).toBe('backup_success')
    })

    test('should limit results correctly', async () => {
      // Create 5 notifications
      for (let i = 0; i < 5; i++) {
        await notifications.backupSuccess({ backupPath: `/tmp/${i}`, size: 100 })
      }

      const recent = notifications.getRecent(3)
      expect(recent).toHaveLength(3)
    })
  })

  describe('getNotificationsByType', () => {
    test('should filter notifications by type', async () => {
      await notifications.backupSuccess({ backupPath: '/tmp/1', size: 100 })
      await notifications.backupFailure({ error: 'error 1' })
      await notifications.backupSuccess({ backupPath: '/tmp/2', size: 200 })
      await notifications.schedulerError({ error: 'scheduler error' })

      const successNotifications = notificationService.getNotificationsByType('backup_success', 10)
      expect(successNotifications).toHaveLength(2)
      expect(successNotifications.every(n => n.type === 'backup_success')).toBe(true)

      const failureNotifications = notificationService.getNotificationsByType('backup_failure', 10)
      expect(failureNotifications).toHaveLength(1)
      expect(failureNotifications[0].type).toBe('backup_failure')
    })

    test('should limit results by type', async () => {
      // Create 3 success notifications
      for (let i = 0; i < 3; i++) {
        await notifications.backupSuccess({ backupPath: `/tmp/${i}`, size: 100 })
      }

      const limited = notificationService.getNotificationsByType('backup_success', 2)
      expect(limited).toHaveLength(2)
    })
  })

  describe('getNotificationStats', () => {
    test('should return correct statistics', async () => {
      await notifications.backupSuccess({ backupPath: '/tmp/1', size: 100 })
      await notifications.backupSuccess({ backupPath: '/tmp/2', size: 200 })
      await notifications.backupFailure({ error: 'error 1' })
      await notifications.restoreSuccess({ backupPath: '/tmp/restore' })
      await notifications.schedulerError({ error: 'scheduler error' })

      const stats = notifications.getStats()
      
      expect(stats.total).toBe(5)
      expect(stats.byType.backup_success).toBe(2)
      expect(stats.byType.backup_failure).toBe(1)
      expect(stats.byType.restore_success).toBe(1)
      expect(stats.byType.restore_failure).toBe(0)
      expect(stats.byType.scheduler_error).toBe(1)
      expect(stats.recent24h).toBe(5) // All notifications are recent
    })

    test('should calculate recent24h correctly', async () => {
      // Create a notification with mocked old timestamp
      const oldNotification = {
        type: 'backup_success' as const,
        title: 'Old Backup',
        message: 'Old backup message',
        timestamp: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() // 25 hours ago
      }
      
      // Manually add to bypass the addNotification method
      const notifications = notificationService.getRecentNotifications(0) // Get private array
      // @ts-ignore - accessing private property for testing
      notificationService['notifications'].unshift(oldNotification)
      
      // Add recent notification
      await notificationService.notifyBackupSuccess({ backupPath: '/tmp/recent', size: 100 })

      const stats = notificationService.getNotificationStats()
      expect(stats.total).toBe(2)
      expect(stats.recent24h).toBe(1) // Only the recent one
    })
  })

  describe('clearNotifications', () => {
    test('should clear all notifications', async () => {
      await notifications.backupSuccess({ backupPath: '/tmp/1', size: 100 })
      await notifications.backupFailure({ error: 'error' })
      
      expect(notifications.getRecent()).toHaveLength(2)
      
      notifications.clear()
      
      expect(notifications.getRecent()).toHaveLength(0)
      
      const stats = notifications.getStats()
      expect(stats.total).toBe(0)
    })
  })

  describe('notification storage limits', () => {
    test('should maintain maximum notification limit', async () => {
      // Create more than the maximum (100) notifications
      for (let i = 0; i < 110; i++) {
        await notifications.backupSuccess({ backupPath: `/tmp/${i}`, size: 100 })
      }

      const all = notifications.getRecent(200) // Try to get more than exists
      expect(all.length).toBeLessThanOrEqual(100) // Should be capped at maxNotifications
    })
  })
})