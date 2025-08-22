import { prisma } from './db'
import { logger } from './logger'
import { auditLog } from './audit'
import { notifications } from './notifications'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

interface BackupSettings {
  autoBackup: boolean
  backupFrequency: 'daily' | 'weekly' | 'monthly'
  retentionCount: number
  backupLocation: string
}

class BackupScheduler {
  private schedulerInterval: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.init()
  }

  private async init() {
    try {
      const settings = await this.getBackupSettings()
      if (settings.autoBackup) {
        this.startScheduler(settings)
        logger.info('Backup scheduler initialized', { settings })
      }
    } catch (error) {
      logger.error('Failed to initialize backup scheduler', error instanceof Error ? error : undefined)
    }
  }

  private async getBackupSettings(): Promise<BackupSettings> {
    const settingsMap = new Map<string, any>()
    
    const dbSettings = await prisma.systemSetting.findMany({
      where: {
        key: {
          startsWith: 'backup.'
        }
      }
    })

    dbSettings.forEach(setting => {
      const key = setting.key.replace('backup.', '')
      settingsMap.set(key, setting.value)
    })

    return {
      autoBackup: settingsMap.get('autoBackup') === true || settingsMap.get('autoBackup') === 'true',
      backupFrequency: settingsMap.get('backupFrequency') || 'daily',
      retentionCount: Number(settingsMap.get('retentionCount')) || 7,
      backupLocation: settingsMap.get('backupLocation') || '/backups'
    }
  }

  private getScheduleInterval(frequency: string): number {
    switch (frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000 // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000 // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000 // 30 days
      default:
        return 24 * 60 * 60 * 1000
    }
  }

  public async startScheduler(settings: BackupSettings) {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
    }

    if (!settings.autoBackup) {
      logger.info('Automatic backup is disabled')
      return
    }

    const interval = this.getScheduleInterval(settings.backupFrequency)
    
    this.schedulerInterval = setInterval(async () => {
      try {
        await this.performAutomaticBackup()
      } catch (error) {
        logger.error('Automatic backup failed', error instanceof Error ? error : undefined)
      }
    }, interval)

    logger.info('Backup scheduler started', {
      frequency: settings.backupFrequency,
      intervalMs: interval,
      nextBackup: new Date(Date.now() + interval).toISOString()
    })

    // Perform immediate backup if none exists
    const existingBackups = await this.listBackups()
    if (existingBackups.length === 0) {
      setTimeout(() => this.performAutomaticBackup(), 5000) // Wait 5 seconds then backup
    }
  }

  public stopScheduler() {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval)
      this.schedulerInterval = null
      logger.info('Backup scheduler stopped')
    }
  }

  public async restartScheduler() {
    try {
      this.stopScheduler()
      const settings = await this.getBackupSettings()
      await this.startScheduler(settings)
    } catch (error) {
      logger.error('Failed to restart backup scheduler', error instanceof Error ? error : undefined)
    }
  }

  private async performAutomaticBackup(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Backup already in progress, skipping scheduled backup')
      return
    }

    this.isRunning = true
    logger.info('Starting automatic backup')

    try {
      const settings = await this.getBackupSettings()
      const result = await this.createBackup(settings)
      
      if (result.success) {
        await this.cleanupOldBackups(settings)
        logger.info('Automatic backup completed successfully', { 
          backupPath: result.backupPath,
          size: result.size 
        })
        
        // Send success notification
        await notifications.backupSuccess({
          backupPath: result.backupPath!,
          size: result.size!,
          automatic: true,
          userId: 0
        })
        
        // Audit log for automatic backup
        await auditLog({
          userId: 0, // System user
          entity: 'SystemBackup',
          entityId: 0,
          action: 'create',
          changes: {
            automatic: true,
            backupPath: result.backupPath,
            backupSize: result.size,
            timestamp: new Date().toISOString()
          }
        })
      } else {
        throw new Error(result.error || 'Unknown backup error')
      }
    } catch (error) {
      logger.error('Automatic backup failed', error instanceof Error ? error : undefined)
      
      // Send failure notification
      await notifications.backupFailure({
        error: error instanceof Error ? error.message : 'Unknown error',
        automatic: true,
        userId: 0
      })
      
      // Audit log for failed backup
      await auditLog({
        userId: 0,
        entity: 'SystemBackup',
        entityId: 0,
        action: 'create',
        changes: {
          automatic: true,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })
    } finally {
      this.isRunning = false
    }
  }

  private async createBackup(settings: BackupSettings): Promise<{ success: boolean; backupPath?: string; size?: number; error?: string }> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupFileName = `matrix-flow-backup-${timestamp}.sql`
      const backupPath = path.join(settings.backupLocation, backupFileName)

      // Ensure backup directory exists
      await fs.promises.mkdir(settings.backupLocation, { recursive: true })

      // Get database connection details
      const databaseUrl = process.env.DATABASE_URL
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured')
      }

      const dbUrl = new URL(databaseUrl)
      const dbHost = dbUrl.hostname
      const dbPort = dbUrl.port || '5432'
      const dbName = dbUrl.pathname.slice(1)
      const dbUser = dbUrl.username
      const dbPassword = dbUrl.password

      const env = {
        ...process.env,
        PGPASSWORD: dbPassword
      }

      const dumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password --verbose --clean --if-exists --create > ${backupPath}`
      
      await execAsync(dumpCommand, { env, timeout: 300000 })
      
      const stats = await fs.promises.stat(backupPath)
      if (stats.size === 0) {
        throw new Error('Backup file is empty')
      }

      return {
        success: true,
        backupPath,
        size: stats.size
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  public async listBackups(): Promise<Array<{ name: string; path: string; size: number; createdAt: Date }>> {
    try {
      const settings = await this.getBackupSettings()
      const files = await fs.promises.readdir(settings.backupLocation)
      const backupFiles = []

      for (const file of files) {
        if (file.startsWith('matrix-flow-backup-') && file.endsWith('.sql')) {
          const filePath = path.join(settings.backupLocation, file)
          const stats = await fs.promises.stat(filePath)
          backupFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime
          })
        }
      }

      return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      logger.warn('Failed to list backups', { error: error instanceof Error ? error.message : 'Unknown error' })
      return []
    }
  }

  private async cleanupOldBackups(settings: BackupSettings): Promise<void> {
    try {
      const backups = await this.listBackups()
      
      if (backups.length <= settings.retentionCount) {
        return // No cleanup needed
      }

      const backupsToDelete = backups.slice(settings.retentionCount)
      
      for (const backup of backupsToDelete) {
        try {
          await fs.promises.unlink(backup.path)
          logger.info('Deleted old backup', { 
            backup: backup.name, 
            age: Math.floor((Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24)) + ' days'
          })
        } catch (error) {
          logger.warn('Failed to delete old backup', { 
            backup: backup.name, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        }
      }

      logger.info('Backup cleanup completed', { 
        total: backups.length, 
        deleted: backupsToDelete.length, 
        retained: settings.retentionCount 
      })
    } catch (error) {
      logger.error('Backup cleanup failed', error instanceof Error ? error : undefined)
    }
  }

  public async getStatus(): Promise<{ 
    isEnabled: boolean; 
    isRunning: boolean; 
    nextBackup?: Date; 
    lastBackup?: Date;
    backupCount: number;
  }> {
    try {
      const settings = await this.getBackupSettings()
      const backups = await this.listBackups()
      
      let nextBackup: Date | undefined
      if (settings.autoBackup && this.schedulerInterval) {
        const interval = this.getScheduleInterval(settings.backupFrequency)
        nextBackup = new Date(Date.now() + interval)
      }

      return {
        isEnabled: settings.autoBackup,
        isRunning: this.isRunning,
        nextBackup,
        lastBackup: backups.length > 0 ? backups[0].createdAt : undefined,
        backupCount: backups.length
      }
    } catch (error) {
      logger.error('Failed to get backup status', error instanceof Error ? error : undefined)
      return {
        isEnabled: false,
        isRunning: false,
        backupCount: 0
      }
    }
  }
}

// Global scheduler instance
export const backupScheduler = new BackupScheduler()