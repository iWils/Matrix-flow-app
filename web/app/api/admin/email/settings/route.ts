import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'
import { EmailSettingsSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'

interface EmailSettings {
  smtp: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
  from: {
    name: string
    email: string
  }
  enabled: boolean
}

export async function GET(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to access email settings', {
      endpoint: '/api/admin/email/settings',
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
    logger.warn('Non-admin user attempted to access email settings', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/admin/email/settings',
      method: 'GET'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    logger.info('Fetching email settings', {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/email/settings',
      method: 'GET'
    })

    // Retrieve email-specific settings from database
    const emailSettings = await prisma.systemSetting.findMany({
      where: {
        category: 'email'
      },
      orderBy: { key: 'asc' }
    })

    // Secure default configuration
    const defaultSettings: EmailSettings = {
      smtp: {
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: '' // Will be masked in response
      },
      from: {
        name: 'Matrix Flow',
        email: 'noreply@example.com'
      },
      enabled: false
    }

    // Apply database settings over defaults with type safety
    emailSettings.forEach((setting) => {
      // Convert JsonValue to string, handling null values
      const settingValue = setting.value ? String(setting.value) : ''
      const keyParts = setting.key.replace('email.', '').split('.')
      
      if (keyParts.length >= 2) {
        const [section, field] = keyParts
        
        if (section === 'smtp' && defaultSettings.smtp.hasOwnProperty(field)) {
          const smtpField = field as keyof typeof defaultSettings.smtp
          if (smtpField === 'port') {
            const portValue = Number(settingValue)
            if (!isNaN(portValue)) {
              defaultSettings.smtp.port = portValue
            }
          } else if (smtpField === 'secure') {
            defaultSettings.smtp.secure = settingValue === 'true'
          } else {
            ;(defaultSettings.smtp as Record<string, unknown>)[smtpField] = settingValue
          }
        } else if (section === 'from' && defaultSettings.from.hasOwnProperty(field)) {
          ;(defaultSettings.from as Record<string, unknown>)[field] = settingValue
        }
      } else if (keyParts[0] === 'enabled') {
        defaultSettings.enabled = settingValue === 'true'
      }
    })

    // Mask sensitive information in response
    const safeSettings = {
      ...defaultSettings,
      smtp: {
        ...defaultSettings.smtp,
        password: defaultSettings.smtp.password ? '********' : ''
      }
    }

    logger.info('Email settings retrieved successfully', {
      userId: parseInt(session.user.id as string),
      emailEnabled: defaultSettings.enabled,
      hasSmtpConfig: !!defaultSettings.smtp.host,
      settingsCount: emailSettings.length
    })

    return NextResponse.json<ApiResponse<EmailSettings>>({
      success: true,
      data: safeSettings,
      message: 'Email settings retrieved successfully'
    })

  } catch (error) {
    logger.error('Error fetching email settings', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/email/settings',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch email settings'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to update email settings', {
      endpoint: '/api/admin/email/settings',
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
    logger.warn('Non-admin user attempted to update email settings', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/admin/email/settings',
      method: 'POST'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    logger.info('Starting email settings update', {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/email/settings',
      method: 'POST'
    })

    const body = await request.json()
    const validatedSettings = EmailSettingsSchema.parse(body)

    // Get current settings for audit comparison
    const currentSettings = await prisma.systemSetting.findMany({
      where: { category: 'email' }
    })
    const currentSettingsMap = new Map(
      currentSettings.map((s) => [s.key, String(s.value)])
    )

    // Track changes for audit (without sensitive data)
    const changes: Array<{ key: string; changed: boolean }> = []
    const upsertPromises: Array<ReturnType<typeof prisma.systemSetting.upsert>> = []
    
    // Recursive function to process nested settings securely
    function processSettings(obj: Record<string, unknown>, prefix = 'email') {
      for (const [key, value] of Object.entries(obj)) {
        const settingKey = `${prefix}.${key}`
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processSettings(value as Record<string, unknown>, settingKey)
        } else {
          const currentValue = currentSettingsMap.get(settingKey)
          const hasChanged = currentValue !== value
          
          // Track changes (mask sensitive fields)
          if (hasChanged) {
            changes.push({
              key: settingKey.includes('password') ? settingKey.replace(/password/, 'password[MASKED]') : settingKey,
              changed: true
            })
          }

          upsertPromises.push(
            prisma.systemSetting.upsert({
              where: { key: settingKey },
              update: {
                value: value as string,
                category: 'email',
                updatedAt: new Date()
              },
              create: {
                key: settingKey,
                value: value as string,
                category: 'email',
                description: `Email configuration - ${key}`,
                createdAt: new Date()
              }
            })
          )
        }
      }
    }

    // Test email configuration if SMTP settings are provided
    if (validatedSettings.smtp && validatedSettings.enabled) {
      try {
        // Here you would implement actual email testing
        // For now, we'll just validate the configuration format
        if (!validatedSettings.smtp.host || !validatedSettings.smtp.username) {
          return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: 'SMTP host and username are required when email is enabled'
          }, { status: 400 })
        }

        if (validatedSettings.smtp.port < 1 || validatedSettings.smtp.port > 65535) {
          return NextResponse.json<ApiResponse<null>>({
            success: false,
            message: 'SMTP port must be between 1 and 65535'
          }, { status: 400 })
        }
      } catch (testError) {
        logger.warn('Email configuration test failed', {
          userId: parseInt(session.user.id as string),
          smtpHost: validatedSettings.smtp.host,
          smtpPort: validatedSettings.smtp.port,
          error: testError instanceof Error ? testError.message : 'Unknown error'
        })
      }
    }

    // Process and save settings
    processSettings(validatedSettings)
    
    // Execute all upserts in transaction for data integrity
    await prisma.$transaction(upsertPromises)

    // Comprehensive audit log for security tracking
    if (changes.length > 0) {
      await auditLog({
        userId: parseInt(session.user.id as string),
        entity: 'EmailSettings',
        entityId: 0, // System level
        action: 'update',
        changes: {
          settingsModified: changes.length,
          emailEnabled: validatedSettings.enabled,
          modifications: changes,
          hasSmtpChanges: changes.some(c => c.key.includes('smtp'))
        }
      })

      // Special logging for security-relevant changes
      if (changes.some(c => c.key.includes('password') || c.key.includes('enabled'))) {
        logger.warn('Critical email settings modified', {
          userId: parseInt(session.user.id as string),
          username: session.user.name || session.user.email,
          emailEnabled: validatedSettings.enabled,
          smtpHost: validatedSettings.smtp?.host ? '[CONFIGURED]' : '[NOT_SET]',
          securityRelevantChanges: changes.filter(c =>
            c.key.includes('password') || c.key.includes('enabled')
          ).length
        })
      }
    }

    logger.info('Email settings updated successfully', {
      userId: parseInt(session.user.id as string),
      changesCount: changes.length,
      emailEnabled: validatedSettings.enabled,
      hasSmtpConfig: !!(validatedSettings.smtp?.host),
      smtpSecure: validatedSettings.smtp?.secure
    })

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: `Email settings updated successfully (${changes.length} changes)`
    })

  } catch (error) {
    logger.error('Error updating email settings', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/email/settings',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update email settings'
    }, { status: 500 })
  }
}