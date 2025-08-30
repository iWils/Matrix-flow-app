import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { advancedWebhookService } from '@/lib/advanced-webhooks'
import { z } from 'zod'

const DeliveryStatsSchema = z.object({
  timeRange: z.enum(['hour', 'day', 'week', 'month']).optional().default('day')
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view webhook delivery stats
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const statsQuery = searchParams.get('stats')
    const limitQuery = searchParams.get('limit')

    if (statsQuery === 'true') {
      // Return webhook delivery statistics
      const timeRange = DeliveryStatsSchema.parse({
        timeRange: searchParams.get('timeRange')
      }).timeRange

      const stats = await advancedWebhookService.getWebhookStats(timeRange)
      
      return NextResponse.json({
        success: true,
        data: stats,
        timeRange
      })
    } else {
      // Return recent webhook deliveries
      const limit = limitQuery ? parseInt(limitQuery) : 50
      const deliveries = await advancedWebhookService.getRecentDeliveries(limit)
      
      return NextResponse.json({
        success: true,
        data: deliveries,
        count: deliveries.length
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error fetching webhook deliveries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook deliveries' },
      { status: 500 }
    )
  }
}