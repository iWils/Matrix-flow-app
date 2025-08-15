import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer tous les paramètres système
    const settings = await prisma.systemSetting.findMany()
    
    // Organiser les paramètres par catégorie
    const organizedSettings = {
      general: {
        appName: 'Matrix Flow',
        appDescription: 'Gestion des matrices de flux réseau',
        defaultLanguage: 'fr',
        timezone: 'Europe/Paris',
        maintenanceMode: false
      },
      security: {
        sessionTimeout: 720,
        passwordMinLength: 8,
        passwordRequireSpecialChars: true,
        maxLoginAttempts: 5,
        lockoutDuration: 15
      },
      audit: {
        retentionDays: 90,
        logLevel: 'info',
        enableFileLogging: true,
        maxLogFileSize: 100
      },
      backup: {
        autoBackup: false,
        backupFrequency: 'daily',
        retentionCount: 7,
        backupLocation: '/backups'
      }
    }

    // Appliquer les paramètres de la base de données
    settings.forEach(setting => {
      const [category, key] = setting.key.split('.')
      if (organizedSettings[category as keyof typeof organizedSettings]) {
        (organizedSettings[category as keyof typeof organizedSettings] as any)[key] = setting.value
      }
    })

    return NextResponse.json(organizedSettings)
  } catch (error) {
    console.error('Error fetching system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await request.json()

    // Sauvegarder chaque paramètre
    const promises = []
    
    for (const [category, categorySettings] of Object.entries(settings)) {
      for (const [key, value] of Object.entries(categorySettings as any)) {
        const settingKey = `${category}.${key}`
        promises.push(
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
              description: `${category} - ${key}`
            }
          })
        )
      }
    }

    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving system settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}