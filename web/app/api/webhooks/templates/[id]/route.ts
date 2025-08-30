import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import { z } from 'zod'

const UpdateTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  events: z.array(z.string()).min(1).optional(),
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
  enabled: z.boolean().optional()
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { id: templateId } = await params

    const template = await prisma.webhookTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    })

    if (!template) {
      return NextResponse.json(
        { error: 'Webhook template not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: template
    })

  } catch (error) {
    console.error('Error fetching webhook template:', error)
    return NextResponse.json(
      { error: 'Failed to fetch webhook template' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { id: templateId } = await params
    const body = await request.json()
    const updates = UpdateTemplateSchema.parse(body)

    // Validate JavaScript transformation code if provided
    if (updates.payloadTransform) {
      try {
        new Function('payload', updates.payloadTransform)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid payload transformation code', details: error instanceof Error ? error.message : 'Syntax error' },
          { status: 400 }
        )
      }
    }

    // Check if template exists and user owns it
    const existingTemplate = await prisma.webhookTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Webhook template not found' },
        { status: 404 }
      )
    }

    // Update template
    const updatedTemplate = await prisma.webhookTemplate.update({
      where: { id: templateId },
      data: {
        ...updates,
        customHeaders: updates.customHeaders as any,
        retryPolicy: updates.retryPolicy as any,
        updatedAt: new Date()
      }
    })

    // Log template update
    await auditLog({
      userId,
      entity: 'webhook_template',
      entityId: 0,
      action: 'update',
      changes: {
        templateId,
        updates: Object.keys(updates),
        enabled: updatedTemplate.enabled
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: 'Webhook template updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid update data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error updating webhook template:', error)
    return NextResponse.json(
      { error: 'Failed to update webhook template' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { id: templateId } = await params

    // Check if template exists and user owns it
    const existingTemplate = await prisma.webhookTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    })

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Webhook template not found' },
        { status: 404 }
      )
    }

    // Delete template
    await prisma.webhookTemplate.delete({
      where: { id: templateId }
    })

    // Log template deletion
    await auditLog({
      userId,
      entity: 'webhook_template',
      entityId: 0,
      action: 'delete',
      changes: {
        templateId,
        name: existingTemplate.name,
        deleted: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Webhook template deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting webhook template:', error)
    return NextResponse.json(
      { error: 'Failed to delete webhook template' },
      { status: 500 }
    )
  }
}