import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'
import { SystemSettingsSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'

interface SystemSettings {
  general: {
    appName: string
    appDescription: string
    defaultLanguage: string
    timezone: string
    maintenanceMode: boolean
  }
  security: {
    sessionTimeout: number
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    maxLoginAttempts: number
    lockoutDuration: number
  }
  audit: {
    retentionDays: number
    logLevel: string
    enableFileLogging: boolean
    maxLogFileSize: number
  }
  backup: {
    autoBackup: boolean
    backupFrequency: string
    retentionCount: number
    backupLocation: string
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to access system settings', {
      endpoint: '/api/admin/system/settings',
      method: 'GET',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    logger.warn('Non-admin user attempted to access system settings', {
      userId: session.user.id,
      userRole: session.user.role,
      endpoint: '/api/admin/system/settings',
      method: 'GET'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    logger.info('Fetching system settings', {
      userId: session.user.id,
      endpoint: '/api/admin/system/settings',
      method: 'GET'
    })

    // Retrieve all system settings from database
    const dbSettings = await prisma.systemSetting.findMany({
      orderBy: { category: 'asc' }
    })
    
    // Default configuration with secure defaults
    const organizedSettings: SystemSettings = {
      general: {
        appName: 'Matrix Flow',
        appDescription: 'Gestion des matrices de flux réseau',
        defaultLanguage: 'fr',
        timezone: 'Europe/Paris',
        maintenanceMode: false
      },
      security: {
        sessionTimeout: 720, // 12 hours in minutes
        passwordMinLength: 8,
        passwordRequireSpecialChars: true,
        maxLoginAttempts: 5,
        lockoutDuration: 15 // minutes
      },
      audit: {
        retentionDays: 90,
        logLevel: 'info',
        enableFileLogging: true,
        maxLogFileSize: 100 // MB
      },
      backup: {
        autoBackup: false,
        backupFrequency: 'daily',
        retentionCount: 7,
        backupLocation: '/backups'
      }
    }

    // Apply database settings over defaults
    dbSettings.forEach((setting: any) => {
      const keyParts = setting.key.split('.')
      if (keyParts.length === 2) {
        const [category, key] = keyParts
        if (organizedSettings[category as keyof SystemSettings]) {
          const categorySettings = organizedSettings[category as keyof SystemSettings] as any
          if (categorySettings.hasOwnProperty(key)) {
            // Type conversion based on default value type
            const defaultValue = categorySettings[key]
            if (typeof defaultValue === 'boolean') {
              categorySettings[key] = setting.value === true || setting.value === 'true'
            } else if (typeof defaultValue === 'number') {
              const numValue = Number(setting.value)
              categorySettings[key] = isNaN(numValue) ? defaultValue : numValue
            } else {
              categorySettings[key] = setting.value
            }
          }
        }
      }
    })

    logger.info('System settings retrieved successfully', {
      userId: session.user.id,
      settingsCount: dbSettings.length,
      categoriesCount: Object.keys(organizedSettings).length
    })

    return NextResponse.json<ApiResponse<SystemSettings>>({
      success: true,
      data: organizedSettings,
      message: 'System settings retrieved successfully'
    })

  } catch (error) {
    logger.error('Error fetching system settings', error instanceof Error ? error : undefined, {
      userId: session.user.id,
      endpoint: '/api/admin/system/settings',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch system settings'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to update system settings', {
      endpoint: '/api/admin/system/settings',
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
    logger.warn('Non-admin user attempted to update system settings', {
      userId: session.user.id,
      userRole: session.user.role,
      endpoint: '/api/admin/system/settings',
      method: 'POST'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    logger.info('Starting system settings update', {
      userId: session.user.id,
      endpoint: '/api/admin/system/settings',
      method: 'POST'
    })

    const body = await request.json()
    const validatedSettings = SystemSettingsSchema.parse(body)

    // Get current settings for audit comparison
    const currentSettings = await prisma.systemSetting.findMany()
    const currentSettingsMap = new Map(
      currentSettings.map((s: any) => [s.key, s.value])
    )

    // Track changes for audit
    const changes: Array<{ key: string; oldValue: any; newValue: any }> = []
    const upsertPromises: any[] = []
    
    // Process each category and setting
    for (const [category, categorySettings] of Object.entries(validatedSettings)) {
      if (categorySettings) {
        for (const [key, value] of Object.entries(categorySettings)) {
          const settingKey = `${category}.${key}`
          const currentValue = currentSettingsMap.get(settingKey)
          
          // Track changes for audit
          if (currentValue !== value) {
            changes.push({
              key: settingKey,
              oldValue: currentValue,
              newValue: value
            })
          }

          upsertPromises.push(
            prisma.systemSetting.upsert({
              where: { key: settingKey },
              update: {
                value: value as any,
                category: category,
                updatedAt: new Date()
              },
              create: {
                key: settingKey,
                value: value as any,
                category: category,
                description: `${category} - ${key}`,
                createdAt: new Date()
              }
            })
          )
        }
      }
    }

    // Execute all upserts in transaction for data integrity
    await prisma.$transaction(upsertPromises)

    // Comprehensive audit log for security tracking
    if (changes.length > 0) {
      await auditLog({
        userId: session.user.id,
        entity: 'SystemSettings',
        entityId: 0, // System level
        action: 'update',
        changes: {
          settingsModified: changes.length,
          categories: Object.keys(validatedSettings),
          modifications: changes
        }
      })

      // Log critical security setting changes
      const securityChanges = changes.filter(c => c.key.startsWith('security.'))
      if (securityChanges.length > 0) {
        logger.warn('Critical security settings modified', {
          userId: session.user.id,
          username: session.user.name || session.user.email,
          securityChanges: securityChanges.map(c => ({
            setting: c.key,
            from: c.oldValue,
            to: c.newValue
          }))
        })
      }
    }

    logger.info('System settings updated successfully', {
      userId: session.user.id,
      changesCount: changes.length,
      categoriesUpdated: Object.keys(validatedSettings).length,
      hasSecurityChanges: changes.some(c => c.key.startsWith('security.'))
    })

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: `System settings updated successfully (${changes.length} changes)`
    })

  } catch (error) {
    logger.error('Error updating system settings', error instanceof Error ? error : undefined, {
      userId: session.user.id,
      endpoint: '/api/admin/system/settings',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update system settings'
    }, { status: 500 })
  }
}