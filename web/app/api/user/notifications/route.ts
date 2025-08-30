import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const NotificationPreferenceSchema = z.object({
  // Email notifications
  emailEnabled: z.boolean().optional(),
  emailChangeRequests: z.boolean().optional(),
  emailChangeApprovals: z.boolean().optional(),
  emailSecurityAlerts: z.boolean().optional(),
  emailSystemAlerts: z.boolean().optional(),
  emailDailyDigest: z.boolean().optional(),
  emailWeeklyReport: z.boolean().optional(),
  
  // Push notifications
  pushEnabled: z.boolean().optional(),
  pushChangeRequests: z.boolean().optional(),
  pushChangeApprovals: z.boolean().optional(),
  pushSecurityAlerts: z.boolean().optional(),
  pushSystemAlerts: z.boolean().optional(),
  pushInstantAlerts: z.boolean().optional(),
  
  // In-app notifications
  inAppEnabled: z.boolean().optional(),
  inAppChangeRequests: z.boolean().optional(),
  inAppChangeApprovals: z.boolean().optional(),
  inAppSecurityAlerts: z.boolean().optional(),
  inAppSystemAlerts: z.boolean().optional(),
  
  // Timing preferences
  digestFrequency: z.enum(['daily', 'weekly', 'never']).optional(),
  digestTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  quietHoursEnd: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  
  // Webhook preferences
  webhookEnabled: z.boolean().optional(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
  webhookEvents: z.array(z.string()).optional(),
  webhookSecret: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    })

    // Create default preferences if none exist
    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId,
          // All other fields use schema defaults
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: preferences
    })

  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()

    const validatedData = NotificationPreferenceSchema.parse(body)

    // Validate quiet hours logic
    if (validatedData.quietHoursEnabled && 
        (!validatedData.quietHoursStart || !validatedData.quietHoursEnd)) {
      return NextResponse.json(
        { error: 'Quiet hours start and end times are required when enabled' },
        { status: 400 }
      )
    }

    // Validate webhook URL when webhook is enabled
    if (validatedData.webhookEnabled && !validatedData.webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required when webhooks are enabled' },
        { status: 400 }
      )
    }

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        ...validatedData
      },
      update: validatedData
    })

    // Log the preference change
    await prisma.auditLog.create({
      data: {
        userId,
        entity: 'notification_preferences',
        entityId: preferences.id,
        action: 'update',
        changes: {
          updated_fields: Object.keys(validatedData),
          new_values: validatedData
        },
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      data: preferences,
      message: 'Notification preferences updated successfully'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    // Reset to defaults instead of deleting
    const defaultPreferences = await prisma.notificationPreference.upsert({
      where: { userId },
      create: {
        userId
        // Schema defaults will be used
      },
      update: {
        // Reset all to defaults
        emailEnabled: true,
        emailChangeRequests: true,
        emailChangeApprovals: true,
        emailSecurityAlerts: true,
        emailSystemAlerts: true,
        emailDailyDigest: false,
        emailWeeklyReport: false,
        
        pushEnabled: false,
        pushChangeRequests: true,
        pushChangeApprovals: true,
        pushSecurityAlerts: true,
        pushSystemAlerts: true,
        pushInstantAlerts: false,
        
        inAppEnabled: true,
        inAppChangeRequests: true,
        inAppChangeApprovals: true,
        inAppSecurityAlerts: true,
        inAppSystemAlerts: true,
        
        digestFrequency: 'daily',
        digestTime: '09:00',
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
        
        webhookEnabled: false,
        webhookUrl: null,
        webhookEvents: [],
        webhookSecret: null
      }
    })

    // Log the reset
    await prisma.auditLog.create({
      data: {
        userId,
        entity: 'notification_preferences',
        entityId: defaultPreferences.id,
        action: 'update',
        changes: {
          action: 'reset_to_defaults',
          reset_at: new Date().toISOString()
        },
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      data: defaultPreferences,
      message: 'Notification preferences reset to defaults'
    })

  } catch (error) {
    console.error('Error resetting notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to reset notification preferences' },
      { status: 500 }
    )
  }
}