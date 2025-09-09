import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'
import { SystemSettingsSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'

// Messages internationalisés pour les paramètres système
const SYSTEM_SETTINGS_MESSAGES = {
  updated: {
    fr: 'Paramètres système mis à jour avec succès',
    en: 'System settings updated successfully',
    es: 'Configuración del sistema actualizada exitosamente'
  },
  retrieved: {
    fr: 'Paramètres système récupérés avec succès',
    en: 'System settings retrieved successfully',
    es: 'Configuración del sistema recuperada exitosamente'
  },
  updateError: {
    fr: 'Erreur lors de la mise à jour des paramètres système',
    en: 'Error updating system settings',
    es: 'Error al actualizar la configuración del sistema'
  },
  fetchError: {
    fr: 'Erreur lors de la récupération des paramètres système',
    en: 'Failed to fetch system settings',
    es: 'Error al recuperar la configuración del sistema'
  }
}

function getSystemSettingsMessage(type: keyof typeof SYSTEM_SETTINGS_MESSAGES, lang: string = 'fr') {
  const normalizedLang = lang.toLowerCase().substring(0, 2) as 'fr' | 'en' | 'es'
  return SYSTEM_SETTINGS_MESSAGES[type][normalizedLang] || SYSTEM_SETTINGS_MESSAGES[type].fr
}

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
      userId: parseInt(session.user.id as string),
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
      userId: parseInt(session.user.id as string),
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
    dbSettings.forEach((setting) => {
      const keyParts = setting.key.split('.')
      if (keyParts.length === 2) {
        const [category, key] = keyParts
        if (organizedSettings[category as keyof SystemSettings]) {
          const categorySettings = organizedSettings[category as keyof SystemSettings] as Record<string, unknown>
          if (categorySettings.hasOwnProperty(key)) {
            // Type conversion based on default value type
            const defaultValue = categorySettings[key]
            if (typeof defaultValue === 'boolean') {
              categorySettings[key] = String(setting.value) === 'true'
            } else if (typeof defaultValue === 'number') {
              const numValue = Number(String(setting.value))
              categorySettings[key] = isNaN(numValue) ? defaultValue : numValue
            } else {
              categorySettings[key] = String(setting.value)
            }
          }
        }
      }
    })

    logger.info('System settings retrieved successfully', {
      userId: parseInt(session.user.id as string),
      settingsCount: dbSettings.length,
      categoriesCount: Object.keys(organizedSettings).length
    })

    // Détecter la langue depuis les headers
    const acceptLanguage = request.headers.get('accept-language') || 'fr'
    const userLang = acceptLanguage.split(',')[0] || 'fr'
    
    return NextResponse.json<ApiResponse<SystemSettings>>({
      success: true,
      data: organizedSettings,
      message: getSystemSettingsMessage('retrieved', userLang)
    })

  } catch (error) {
    logger.error('Error fetching system settings', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/settings',
      method: 'GET'
    })

    // Détecter la langue depuis les headers pour les erreurs aussi
    const acceptLanguage = request.headers.get('accept-language') || 'fr'
    const userLang = acceptLanguage.split(',')[0] || 'fr'
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: getSystemSettingsMessage('fetchError', userLang)
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
      userId: parseInt(session.user.id as string),
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
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/settings',
      method: 'POST'
    })

    const body = await request.json()
    const validatedSettings = SystemSettingsSchema.parse(body)

    // Get current settings for audit comparison
    const currentSettings = await prisma.systemSetting.findMany()
    const currentSettingsMap = new Map(
      currentSettings.map((s) => [s.key, String(s.value)])
    )

    // Track changes for audit
    const changes: Array<{ key: string; oldValue: unknown; newValue: unknown }> = []
    const upsertPromises: Array<ReturnType<typeof prisma.systemSetting.upsert>> = []
    
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
                value: value as string,
                category: category,
                updatedAt: new Date()
              },
              create: {
                key: settingKey,
                value: value as string,
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
        userId: parseInt(session.user.id as string),
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
          userId: parseInt(session.user.id as string),
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
      userId: parseInt(session.user.id as string),
      changesCount: changes.length,
      categoriesUpdated: Object.keys(validatedSettings).length,
      hasSecurityChanges: changes.some(c => c.key.startsWith('security.'))
    })

    // Détecter la langue depuis les headers
    const acceptLanguage = request.headers.get('accept-language') || 'fr'
    const userLang = acceptLanguage.split(',')[0] || 'fr'
    
    const baseMessage = getSystemSettingsMessage('updated', userLang)
    const detailedMessage = changes.length > 0 ? `${baseMessage} (${changes.length} ${changes.length > 1 ? 'modifications' : 'modification'})` : baseMessage
    
    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: detailedMessage
    })

  } catch (error) {
    logger.error('Error updating system settings', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/settings',
      method: 'POST'
    })

    // Détecter la langue depuis les headers pour les erreurs aussi
    const acceptLanguage = request.headers.get('accept-language') || 'fr'
    const userLang = acceptLanguage.split(',')[0] || 'fr'
    
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: getSystemSettingsMessage('updateError', userLang)
    }, { status: 500 })
  }
}