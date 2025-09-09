import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { logger } from '@/lib/logger'
import { backupScheduler } from '@/lib/backup-scheduler'
import { ApiResponse } from '@/types'

// Messages personnalisés pour les actions du scheduler
const SCHEDULER_MESSAGES = {
  start: {
    fr: 'Planificateur de sauvegarde démarré avec succès',
    en: 'Backup scheduler started successfully',
    es: 'Programador de respaldos iniciado exitosamente'
  },
  stop: {
    fr: 'Planificateur de sauvegarde arrêté avec succès',
    en: 'Backup scheduler stopped successfully',
    es: 'Programador de respaldos detenido exitosamente'
  },
  restart: {
    fr: 'Planificateur de sauvegarde redémarré avec succès',
    en: 'Backup scheduler restarted successfully',
    es: 'Programador de respaldos reiniciado exitosamente'
  }
}

function getSchedulerMessage(action: 'start' | 'stop' | 'restart', lang: string = 'fr') {
  const normalizedLang = lang.toLowerCase().substring(0, 2) as 'fr' | 'en' | 'es'
  return SCHEDULER_MESSAGES[action][normalizedLang] || SCHEDULER_MESSAGES[action].fr
}

// GET: Get scheduler status
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
    const status = await backupScheduler.getStatus()
    
    return NextResponse.json<ApiResponse<typeof status>>({
      success: true,
      data: status,
      message: 'Scheduler status retrieved successfully'
    })
  } catch (error) {
    logger.error('Error getting backup scheduler status', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup/scheduler',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to get scheduler status'
    }, { status: 500 })
  }
}

// POST: Control scheduler (start/stop/restart)
export async function POST(request: NextRequest) {
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
    const body = await request.json()
    const { action } = body

    if (!action || !['start', 'stop', 'restart'].includes(action)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid action. Must be: start, stop, or restart'
      }, { status: 400 })
    }

    logger.info('Backup scheduler action requested', {
      userId: parseInt(session.user.id as string),
      action,
      endpoint: '/api/admin/system/backup/scheduler',
      method: 'POST'
    })

    switch (action) {
      case 'start':
      case 'restart':
        await backupScheduler.restartScheduler()
        break
      case 'stop':
        backupScheduler.stopScheduler()
        break
    }

    const status = await backupScheduler.getStatus()

    // Détecter la langue depuis les headers
    const acceptLanguage = request.headers.get('accept-language') || 'fr'
    const userLang = acceptLanguage.split(',')[0] || 'fr'
    
    return NextResponse.json<ApiResponse<typeof status>>({
      success: true,
      data: status,
      message: getSchedulerMessage(action as 'start' | 'stop' | 'restart', userLang)
    })

  } catch (error) {
    logger.error('Error controlling backup scheduler', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/system/backup/scheduler',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to control scheduler'
    }, { status: 500 })
  }
}