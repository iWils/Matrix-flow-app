import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

const WebhookTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  events: z.array(z.string()).min(1),
  payloadTransform: z.string().optional(),
  customHeaders: z.record(z.string(), z.string()).optional(),
  retryPolicy: z.object({
    maxRetries: z.number().min(0).max(10).optional(),
    initialDelay: z.number().min(100).max(60000).optional(),
    maxDelay: z.number().min(1000).max(300000).optional(),
    backoffMultiplier: z.number().min(1).max(10).optional(),
    enableCircuitBreaker: z.boolean().optional(),
    circuitBreakerThreshold: z.number().min(1).max(20).optional(),
    circuitBreakerTimeout: z.number().min(30000).max(3600000).optional()
  }).optional(),
  enabled: z.boolean().optional().default(true)
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()
    const templateData = WebhookTemplateSchema.parse(body)

    // Validate JavaScript transformation code if provided
    if (templateData.payloadTransform) {
      try {
        // Simple validation - try to create a function
        new Function('payload', templateData.payloadTransform)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid payload transformation code', details: error instanceof Error ? error.message : 'Syntax error' },
          { status: 400 }
        )
      }
    }

    // Generate unique template ID
    const templateId = `wht_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const template = await prisma.webhookTemplate.create({
      data: {
        id: templateId,
        userId,
        name: templateData.name,
        description: templateData.description,
        events: templateData.events,
        payloadTransform: templateData.payloadTransform,
        customHeaders: templateData.customHeaders as any,
        retryPolicy: templateData.retryPolicy as any,
        enabled: templateData.enabled
      }
    })

    // Log template creation
    await auditLog({
      userId,
      entity: 'webhook_template',
      entityId: 0,
      action: 'create',
      changes: {
        templateId: template.id,
        name: template.name,
        events: template.events,
        enabled: template.enabled
      }
    })

    return NextResponse.json({
      success: true,
      data: template,
      message: 'Webhook template created successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid template data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error creating webhook template:', error)
    return NextResponse.json(
      { error: 'Failed to create webhook template' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const includeDisabled = searchParams.get('includeDisabled') === 'true'

    const where: any = { userId }
    if (!includeDisabled) {
      where.enabled = true
    }

    const templates = await prisma.webhookTemplate.findMany({
      where,
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: templates,
      count: templates.length
    })

  } catch (error) {
    console.error('Error fetching webhook templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook templates' },
      { status: 500 }
    )
  }
}