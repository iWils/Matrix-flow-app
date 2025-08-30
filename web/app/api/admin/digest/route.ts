import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import DigestService from '@/lib/services/digestService'
import { z } from 'zod'

const DigestActionSchema = z.object({
  action: z.enum(['send', 'preview', 'schedule']),
  type: z.enum(['daily', 'weekly']).optional(),
  date: z.string().optional() // ISO date string
})

// GET - Obtenir des informations sur les digest
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    if (action === 'preview') {
      // Générer un aperçu du digest d'aujourd'hui
      const date = searchParams.get('date') 
        ? new Date(searchParams.get('date')!)
        : new Date()

      const digestData = await DigestService.generateDailyDigestData(date)
      
      return NextResponse.json({
        success: true,
        data: digestData,
        preview: true
      })
    }

    if (action === 'status') {
      // Status du service digest
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const lastDigestData = await DigestService.generateDailyDigestData(yesterday)
      
      return NextResponse.json({
        success: true,
        status: {
          lastDigest: yesterday.toISOString(),
          enabled: process.env.NODE_ENV === 'production',
          nextScheduled: '09:00 daily',
          lastData: lastDigestData
        }
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error in digest API:', error)
    return NextResponse.json(
      { error: 'Failed to process digest request' },
      { status: 500 }
    )
  }
}

// POST - Déclencher des actions sur les digest
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, type = 'daily', date } = DigestActionSchema.parse(body)

    if (action === 'send') {
      // Envoyer le digest maintenant
      const targetDate = date ? new Date(date) : new Date()
      
      let result
      if (type === 'daily') {
        result = await DigestService.sendDailyDigest(targetDate)
      } else {
        result = await DigestService.sendWeeklyDigest()
      }

      return NextResponse.json({
        success: true,
        action: 'send',
        type,
        date: targetDate.toISOString(),
        result: {
          sent: result.sent,
          failed: result.failed,
          errors: result.errors
        }
      })
    }

    if (action === 'preview') {
      // Générer un aperçu des données sans envoyer
      const targetDate = date ? new Date(date) : new Date()
      const digestData = await DigestService.generateDailyDigestData(targetDate)

      return NextResponse.json({
        success: true,
        action: 'preview',
        type,
        date: targetDate.toISOString(),
        data: digestData
      })
    }

    if (action === 'schedule') {
      // Réinitialiser le scheduler (pour debug)
      if (process.env.NODE_ENV === 'production') {
        DigestService.scheduleDaily()
      }

      return NextResponse.json({
        success: true,
        action: 'schedule',
        message: 'Digest scheduler reinitialized',
        enabled: process.env.NODE_ENV === 'production'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Digest action error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Digest action failed' },
      { status: 500 }
    )
  }
}