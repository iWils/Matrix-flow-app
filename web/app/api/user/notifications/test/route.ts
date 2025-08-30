import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email-notifications'
import { PushNotificationService } from '@/lib/push-notifications'
import { z } from 'zod'

const TestNotificationSchema = z.object({
  type: z.enum(['email', 'webhook', 'push']),
  notificationType: z.enum([
    'change_request',
    'change_approval', 
    'security_alert',
    'system_alert',
    'daily_digest'
  ]).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const userEmail = session.user.email
    const body = await request.json()

    const { type, notificationType } = TestNotificationSchema.parse(body)

    // Check user's notification preferences
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId }
    })

    if (!preferences) {
      return NextResponse.json(
        { error: 'No notification preferences found' },
        { status: 404 }
      )
    }

    switch (type) {
      case 'email':
        if (!preferences.emailEnabled) {
          return NextResponse.json(
            { error: 'Email notifications are disabled' },
            { status: 400 }
          )
        }

        const emailSent = await emailService.sendTestEmail(userEmail)
        
        if (!emailSent) {
          return NextResponse.json(
            { error: 'Failed to send test email' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          message: `Test email sent to ${userEmail}`,
          type: 'email'
        })

      case 'webhook':
        if (!preferences.webhookEnabled || !preferences.webhookUrl) {
          return NextResponse.json(
            { error: 'Webhooks are not configured' },
            { status: 400 }
          )
        }

        try {
          const webhookPayload = {
            event: 'test_notification',
            timestamp: new Date().toISOString(),
            user: {
              id: userId,
              email: userEmail,
              name: session.user.name || session.user.email
            },
            data: {
              message: 'This is a test webhook notification from Matrix Flow',
              notificationType: notificationType || 'system_alert'
            }
          }

          const response = await fetch(preferences.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Matrix Flow Webhook',
              ...(preferences.webhookSecret && {
                'X-Webhook-Signature': await generateWebhookSignature(
                  JSON.stringify(webhookPayload),
                  preferences.webhookSecret
                )
              })
            },
            body: JSON.stringify(webhookPayload),
            signal: AbortSignal.timeout(10000) // 10s timeout
          })

          if (!response.ok) {
            throw new Error(`Webhook returned ${response.status}: ${response.statusText}`)
          }

          return NextResponse.json({
            success: true,
            message: `Test webhook sent to ${preferences.webhookUrl}`,
            type: 'webhook',
            response: {
              status: response.status,
              statusText: response.statusText
            }
          })

        } catch (error) {
          return NextResponse.json(
            { 
              error: 'Failed to send test webhook',
              details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
          )
        }

      case 'push':
        if (!preferences.pushEnabled) {
          return NextResponse.json(
            { error: 'Push notifications are disabled' },
            { status: 400 }
          )
        }

        const result = await PushNotificationService.sendTestNotification(userId)
        
        return NextResponse.json({
          success: true,
          message: `Test push notification sent: ${result.sent} successful, ${result.failed} failed`,
          type: 'push',
          details: {
            sent: result.sent,
            failed: result.failed,
            skippedPreferences: result.skippedPreferences,
            skippedQuietHours: result.skippedQuietHours,
            errors: result.errors
          }
        })

      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error testing notification:', error)
    return NextResponse.json(
      { error: 'Failed to test notification' },
      { status: 500 }
    )
  }
}

async function generateWebhookSignature(payload: string, secret: string): Promise<string> {
  const crypto = await import('crypto')
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}