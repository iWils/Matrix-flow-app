import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'
import { notifications } from '@/lib/notifications'
import { ApiResponse } from '@/types'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to create backup', {
      endpoint: '/api/admin/system/backup',
      method: 'POST',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    logger.warn('Non-admin user attempted to create backup', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/admin/system/backup',
      method: 'POST'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    logger.info('Starting system backup', {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup',
      method: 'POST'
    })

    // Get backup settings from database
    const backupLocationSetting = await prisma.systemSetting.findUnique({
      where: { key: 'backup.backupLocation' }
    })

    const backupLocation = (backupLocationSetting?.value as string) || '/backups'
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `matrix-flow-backup-${timestamp}.sql`
    const backupPath = path.join(backupLocation, backupFileName)

    // Ensure backup directory exists
    try {
      await fs.promises.mkdir(backupLocation, { recursive: true })
    } catch (error) {
      logger.error('Failed to create backup directory', error instanceof Error ? error : undefined, {
        backupLocation,
        userId: session.user.id
      })
    }

    // Create database backup using pg_dump
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured')
    }

    // Extract database connection details from URL
    const dbUrl = new URL(databaseUrl)
    const dbHost = dbUrl.hostname
    const dbPort = dbUrl.port || '5432'
    const dbName = dbUrl.pathname.slice(1) // Remove leading slash
    const dbUser = dbUrl.username
    const dbPassword = dbUrl.password

    // Set environment variables for pg_dump
    const env = {
      ...process.env,
      PGPASSWORD: dbPassword
    }

    // Run pg_dump command
    const dumpCommand = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password --verbose --clean --if-exists --create > ${backupPath}`
    
    logger.info('Executing backup command', {
      userId: parseInt(session.user.id as string),
      backupPath,
      command: dumpCommand.replace(dbPassword || '', '***')
    })

    try {
      await execAsync(dumpCommand, { env, timeout: 300000 }) // 5 minute timeout
      
      // Verify backup file was created and has content
      const stats = await fs.promises.stat(backupPath)
      if (stats.size === 0) {
        throw new Error('Backup file is empty')
      }

      // Log successful backup
      await auditLog({
        userId: parseInt(session.user.id as string),
        entity: 'SystemBackup',
        entityId: 0,
        action: 'create',
        changes: {
          backupPath,
          backupSize: stats.size,
          timestamp
        }
      })

      logger.info('System backup completed successfully', {
        userId: parseInt(session.user.id as string),
        backupPath,
        backupSize: stats.size,
        timestamp
      })

      // Send success notification
      await notifications.backupSuccess({
        backupPath,
        size: stats.size,
        automatic: false,
        userId: parseInt(session.user.id as string)
      })

      return NextResponse.json<ApiResponse<{ backupPath: string; size: number }>>({
        success: true,
        message: 'Backup created successfully',
        data: {
          backupPath,
          size: stats.size
        }
      })

    } catch (execError) {
      logger.error('Database backup command failed', execError instanceof Error ? execError : undefined, {
        userId: parseInt(session.user.id as string),
        backupPath,
        command: dumpCommand.replace(dbPassword || '', '***')
      })

      // Try to clean up empty backup file
      try {
        await fs.promises.unlink(backupPath)
      } catch (cleanupError) {
        logger.warn('Failed to clean up empty backup file', {
          backupPath,
          error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error'
        })
      }

      throw new Error(`Backup command failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`)
    }

  } catch (error) {
    logger.error('Error creating system backup', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup',
      method: 'POST'
    })

    // Send failure notification
    await notifications.backupFailure({
      error: error instanceof Error ? error.message : 'Unknown error',
      automatic: false,
      userId: parseInt(session.user.id as string)
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create backup'
    }, { status: 500 })
  }
}

// GET endpoint to list available backups
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
    // Get backup settings from database
    const backupLocationSetting = await prisma.systemSetting.findUnique({
      where: { key: 'backup.backupLocation' }
    })

    const backupLocation = (backupLocationSetting?.value as string) || '/backups'
    
    try {
      const files = await fs.promises.readdir(backupLocation)
      const backupFiles = []

      for (const file of files) {
        if (file.startsWith('matrix-flow-backup-') && file.endsWith('.sql')) {
          const filePath = path.join(backupLocation, file)
          const stats = await fs.promises.stat(filePath)
          backupFiles.push({
            name: file,
            path: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime
          })
        }
      }

      // Sort by creation date (newest first)
      backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      return NextResponse.json<ApiResponse<typeof backupFiles>>({
        success: true,
        data: backupFiles,
        message: `Found ${backupFiles.length} backup files`
      })

    } catch (dirError) {
      logger.warn('Backup directory not found or empty', {
        backupLocation,
        userId: parseInt(session.user.id as string),
        error: dirError instanceof Error ? dirError.message : 'Unknown error'
      })

      return NextResponse.json<ApiResponse<Array<Record<string, unknown>>>>({
        success: true,
        data: [],
        message: 'No backups found'
      })
    }

  } catch (error) {
    logger.error('Error listing backups', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to list backups'
    }, { status: 500 })
  }
}