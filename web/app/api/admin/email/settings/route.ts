import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer les paramètres email
    const emailSettings = await prisma.systemSetting.findMany({
      where: {
        category: 'email'
      }
    })

    // Paramètres par défaut
    const defaultSettings = {
      smtp: {
        host: '',
        port: 587,
        secure: false,
        username: '',
        password: ''
      },
      from: {
        name: 'Matrix Flow',
        email: 'noreply@example.com'
      },
      enabled: false
    }

    // Appliquer les paramètres de la base de données
    emailSettings.forEach(setting => {
      const keyParts = setting.key.replace('email.', '').split('.')
      let current = defaultSettings as any
      
      for (let i = 0; i < keyParts.length - 1; i++) {
        if (!current[keyParts[i]]) {
          current[keyParts[i]] = {}
        }
        current = current[keyParts[i]]
      }
      
      current[keyParts[keyParts.length - 1]] = setting.value
    })

    return NextResponse.json(defaultSettings)
  } catch (error) {
    console.error('Error fetching email settings:', error)
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
    const promises: Promise<any>[] = []
    
    // Fonction récursive pour traiter les objets imbriqués
    function processSettings(obj: any, prefix = 'email') {
      for (const [key, value] of Object.entries(obj)) {
        const settingKey = `${prefix}.${key}`
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          processSettings(value, settingKey)
        } else {
          promises.push(
            prisma.systemSetting.upsert({
              where: { key: settingKey },
              update: {
                value: value as any,
                category: 'email',
                updatedAt: new Date()
              },
              create: {
                key: settingKey,
                value: value as any,
                category: 'email',
                description: `Email - ${key}`
              }
            })
          )
        }
      }
    }

    processSettings(settings)
    await Promise.all(promises)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving email settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}