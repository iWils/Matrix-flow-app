import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'
import { notifications } from '@/lib/notifications'
import { ApiResponse } from '@/types'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to restore backup', {
      endpoint: '/api/admin/system/backup/restore',
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
    logger.warn('Non-admin user attempted to restore backup', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/admin/system/backup/restore',
      method: 'POST'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { backupPath, confirmRestore } = body

    if (!backupPath || !confirmRestore) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Backup path and confirmation are required'
      }, { status: 400 })
    }

    logger.info('Starting database restore', {
      userId: parseInt(session.user.id as string),
      backupPath,
      endpoint: '/api/admin/system/backup/restore',
      method: 'POST'
    })

    // Verify backup file exists
    try {
      await fs.promises.access(backupPath, fs.constants.R_OK)
    } catch (error) {
      logger.error('Backup file not accessible', error instanceof Error ? error : undefined, {
        backupPath,
        userId: session.user.id
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Backup file not found or not accessible'
      }, { status: 404 })
    }

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

    // Set environment variables for psql
    const env = {
      ...process.env,
      PGPASSWORD: dbPassword
    }

    // Stop all active connections before restore (optional - commented for safety)
    // const killConnectionsCommand = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d postgres -c "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${dbName}' AND pid <> pg_backend_pid();"`

    // Restore database using psql
    const restoreCommand = `psql -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} --no-password -f ${backupPath}`
    
    logger.info('Executing restore command', {
      userId: parseInt(session.user.id as string),
      backupPath,
      command: restoreCommand.replace(dbPassword || '', '***')
    })

    try {
      const startTime = Date.now()
      const { stdout, stderr } = await execAsync(restoreCommand, { env, timeout: 600000 }) // 10 minute timeout
      const duration = Date.now() - startTime

      // Log successful restore
      await auditLog({
        userId: parseInt(session.user.id as string),
        entity: 'SystemRestore',
        entityId: 0,
        action: 'create',
        changes: {
          backupPath,
          duration,
          stdout: stdout ? stdout.substring(0, 500) : '', // Limit log size
          stderr: stderr ? stderr.substring(0, 500) : '',
          timestamp: new Date().toISOString()
        }
      })

      logger.info('Database restore completed successfully', {
        userId: parseInt(session.user.id as string),
        backupPath,
        duration,
        hasStdout: !!stdout,
        hasStderr: !!stderr
      })

      // Send success notification
      await notifications.restoreSuccess({
        backupPath,
        duration,
        userId: parseInt(session.user.id as string)
      })

      return NextResponse.json<ApiResponse<{ duration: number; stdout?: string; stderr?: string }>>({
        success: true,
        message: 'Database restored successfully',
        data: {
          duration,
          stdout: stdout || undefined,
          stderr: stderr || undefined
        }
      })

    } catch (execError) {
      logger.error('Database restore command failed', execError instanceof Error ? execError : undefined, {
        userId: parseInt(session.user.id as string),
        backupPath,
        command: restoreCommand.replace(dbPassword || '', '***')
      })

      // Log failed restore
      await auditLog({
        userId: parseInt(session.user.id as string),
        entity: 'SystemRestore',
        entityId: 0,
        action: 'create',
        changes: {
          backupPath,
          success: false,
          error: execError instanceof Error ? execError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      })

      throw new Error(`Restore command failed: ${execError instanceof Error ? execError.message : 'Unknown error'}`)
    }

  } catch (error) {
    logger.error('Error restoring database', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup/restore',
      method: 'POST'
    })

    // Send failure notification
    await notifications.restoreFailure({
      backupPath: backupPath || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: parseInt(session.user.id as string)
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to restore database'
    }, { status: 500 })
  }
}