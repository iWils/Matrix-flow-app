import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { advancedWebhookService } from '@/lib/advanced-webhooks'
import { z } from 'zod'

const SendWebhookSchema = z.object({
  event: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  webhookUrl: z.string().url().optional(), // If specified, send to this URL only
  templateId: z.string().optional(), // If specified, use this template
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10).optional(),
    initialDelay: z.number().min(100).max(60000).optional(),
    maxDelay: z.number().min(1000).max(300000).optional(),
    backoffMultiplier: z.number().min(1).max(10).optional(),
    enableCircuitBreaker: z.boolean().optional(),
    circuitBreakerThreshold: z.number().min(1).max(20).optional(),
    circuitBreakerTimeout: z.number().min(30000).max(3600000).optional()
  }).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  transform: z.string().optional() // JavaScript transformation code
})

const BroadcastWebhookSchema = z.object({
  event: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  targetUsers: z.array(z.number()).optional() // If specified, send only to these users
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const broadcast = searchParams.get('broadcast') === 'true'

    if (broadcast) {
      // Broadcast webhook to all configured endpoints for event
      const body = await request.json()
      const webhookData = BroadcastWebhookSchema.parse(body)

      const deliveries = await advancedWebhookService.broadcastWebhook(
        webhookData.event,
        webhookData.data,
        {
          userId,
          sourceUserId: userId
        }
      )

      return NextResponse.json({
        success: true,
        message: `Webhook broadcasted to ${deliveries.length} endpoints`,
        data: {
          deliveries: deliveries.length,
          deliveryIds: deliveries.map(d => d.id)
        }
      })

    } else {
      // Send webhook to specific URL or using template
      const body = await request.json()
      const webhookData = SendWebhookSchema.parse(body)

      if (!webhookData.webhookUrl && !webhookData.templateId) {
        return NextResponse.json(
          { error: 'Either webhookUrl or templateId must be specified' },
          { status: 400 }
        )
      }

      let webhookUrl = webhookData.webhookUrl
      let templateOptions: any = {}

      // If using template, fetch template configuration
      if (webhookData.templateId) {
        const template = await prisma.webhookTemplate.findFirst({
          where: {
            id: webhookData.templateId,
            userId,
            enabled: true
          }
        })

        if (!template) {
          return NextResponse.json(
            { error: 'Webhook template not found or not enabled' },
            { status: 404 }
          )
        }

        // Use webhook URL from notification preferences
        const preferences = await prisma.notificationPreference.findUnique({
          where: { userId }
        })

        if (!preferences?.webhookEnabled || !preferences.webhookUrl) {
          return NextResponse.json(
            { error: 'Webhook not configured in notification preferences' },
            { status: 400 }
          )
        }

        webhookUrl = preferences.webhookUrl
        templateOptions = {
          retryPolicy: template.retryPolicy,
          headers: template.customHeaders,
          transform: template.payloadTransform,
          secret: preferences.webhookSecret
        }

        // Update template last used
        await prisma.webhookTemplate.update({
          where: { id: template.id },
          data: { lastUsed: new Date() }
        })
      }

      const delivery = await advancedWebhookService.sendWebhook(
        webhookUrl!,
        webhookData.event,
        webhookData.data,
        {
          userId,
          retryPolicy: webhookData.retryPolicy || templateOptions.retryPolicy,
          headers: webhookData.headers || templateOptions.headers,
          transform: webhookData.transform || templateOptions.transform,
          secret: templateOptions.secret
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Webhook sent successfully',
        data: {
          deliveryId: delivery.id,
          status: delivery.status,
          webhookUrl: delivery.webhookUrl.substring(0, 30) + '...'
        }
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid webhook data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error sending webhook:', error)
    return NextResponse.json(
      { error: 'Failed to send webhook' },
      { status: 500 }
    )
  }
}