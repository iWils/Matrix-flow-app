import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { emailService, EmailNotificationService } from '@/lib/email-notifications'
import { EMAIL_TEMPLATES, EmailTemplateType, EmailTemplateData, renderTemplate } from '@/lib/email-templates'
import { z } from 'zod'

const SendNotificationSchema = z.object({
  templateType: z.enum(['CHANGE_APPROVAL', 'CHANGE_NOTIFICATION', 'CHANGE_REJECTION', 'DAILY_DIGEST', 'SECURITY_ALERT']),
  recipients: z.array(z.string().email()),
  data: z.object({
    userName: z.string().optional(),
    matrixName: z.string().optional(),
    actionType: z.string().optional(),
    url: z.string().url().optional(),
    changes: z.string().optional(),
    requesterName: z.string().optional(),
    approverName: z.string().optional(),
    reason: z.string().optional(),
    ipAddress: z.string().optional(),
    timestamp: z.string().optional(),
    date: z.string().optional(),
    totalChanges: z.string().optional(),
    pendingApprovals: z.string().optional(),
    recentChanges: z.array(z.object({
      matrixName: z.string(),
      actionType: z.string(),
      userName: z.string(),
      timestamp: z.string()
    })).optional(),
    alertType: z.string().optional(),
    unsubscribeUrl: z.string().url().optional()
  })
})

const NotificationSettingsSchema = z.object({
  emailEnabled: z.boolean(),
  digestFrequency: z.enum(['daily', 'weekly', 'disabled']),
  securityAlerts: z.boolean(),
  changeNotifications: z.boolean(),
  approvalRequests: z.boolean()
})

// GET - Récupérer les paramètres de notifications
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

    if (action === 'templates') {
      // Liste des templates disponibles
      const templates = Object.entries(EMAIL_TEMPLATES).map(([key, template]) => ({
        id: key,
        name: key.toLowerCase().replace(/_/g, ' '),
        subject: template.subject
      }))

      return NextResponse.json({ templates })
    }

    if (action === 'settings') {
      // Récupérer les paramètres de notification depuis la BD
      const settings = await prisma.systemSetting.findMany({
        where: {
          key: {
            in: ['email_enabled', 'digest_frequency', 'security_alerts', 'change_notifications', 'approval_requests']
          }
        }
      })

      const settingsMap = settings.reduce((acc, setting) => {
        acc[setting.key] = String(setting.value || '')
        return acc
      }, {} as Record<string, string>)

      return NextResponse.json({
        emailEnabled: settingsMap.email_enabled === 'true',
        digestFrequency: settingsMap.digest_frequency || 'daily',
        securityAlerts: settingsMap.security_alerts === 'true',
        changeNotifications: settingsMap.change_notifications === 'true',
        approvalRequests: settingsMap.approval_requests === 'true'
      })
    }

    if (action === 'stats') {
      // Statistiques des notifications
      try {
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        // Protection : vérifier si la table existe
        let todayCount = 0
        let recentNotifications: any[] = []
        
        try {
          const stats = await prisma.emailLog.aggregate({
            where: {
              createdAt: {
                gte: today
              }
            },
            _count: true
          })
          todayCount = stats._count || 0

          recentNotifications = await prisma.emailLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              recipient: true,
              subject: true,
              status: true,
              createdAt: true,
              templateType: true
            }
          })
        } catch (dbError) {
          console.warn('EmailLog table not found, using fallback values')
        }

        return NextResponse.json({
          todayCount,
          recentNotifications,
          emailService: await EmailNotificationService.getStatus()
        })
      } catch (error) {
        console.warn('Error fetching notification stats:', error)
        return NextResponse.json({
          todayCount: 0,
          recentNotifications: [],
          emailService: { enabled: false, configured: false, error: 'Stats unavailable' }
        })
      }
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Error fetching notification data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification data' },
      { status: 500 }
    )
  }
}

// POST - Envoyer une notification ou mettre à jour les paramètres
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
    const action = body.action

    if (action === 'send') {
      // Envoyer une notification
      const { templateType, recipients, data } = SendNotificationSchema.parse(body)
      
      const template = EMAIL_TEMPLATES[templateType as EmailTemplateType]
      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        )
      }

      const emailService = EmailNotificationService.getInstance()
      const results = []

      for (const recipient of recipients) {
        try {
          const renderedSubject = renderTemplate(template.subject, data)
          const renderedHtml = renderTemplate(template.html, data)
          const renderedText = renderTemplate(template.text, data)

          const success = await emailService.sendEmail({
            to: recipient,
            subject: renderedSubject,
            html: renderedHtml,
            text: renderedText
          })

          // Log de la notification
          await prisma.emailLog.create({
            data: {
              recipient,
              subject: renderedSubject,
              templateType,
              status: success ? 'sent' : 'failed',
              sentBy: parseInt(session.user.id as string),
              metadata: JSON.stringify(data)
            }
          })

          results.push({ recipient, success })
        } catch (error) {
          results.push({ 
            recipient, 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      return NextResponse.json({
        success: true,
        sent: successCount,
        total: recipients.length,
        results
      })
    }

    if (action === 'updateSettings') {
      // Mettre à jour les paramètres
      const settings = NotificationSettingsSchema.parse(body.settings)
      
      const settingsToUpdate = [
        { key: 'email_enabled', value: String(settings.emailEnabled) },
        { key: 'digest_frequency', value: settings.digestFrequency },
        { key: 'security_alerts', value: String(settings.securityAlerts) },
        { key: 'change_notifications', value: String(settings.changeNotifications) },
        { key: 'approval_requests', value: String(settings.approvalRequests) }
      ]

      for (const setting of settingsToUpdate) {
        await prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value, category: 'notifications' }
        })
      }

      return NextResponse.json({
        success: true,
        message: 'Notification settings updated'
      })
    }

    if (action === 'test') {
      // Envoyer un email de test
      const { recipient } = z.object({
        recipient: z.string().email()
      }).parse(body)

      const emailService = EmailNotificationService.getInstance()
      const testData: EmailTemplateData = {
        userName: session.user.name || 'Test User',
        matrixName: 'Test Matrix',
        actionType: 'Test Action',
        url: `${process.env.NEXTAUTH_URL}/matrices`,
        timestamp: new Date().toLocaleString('fr-FR'),
        ipAddress: '127.0.0.1'
      }

      const template = EMAIL_TEMPLATES.CHANGE_NOTIFICATION
      const success = await emailService.sendEmail({
        to: recipient,
        subject: renderTemplate(template.subject, testData),
        html: renderTemplate(template.html, testData),
        text: renderTemplate(template.text, testData)
      })

      return NextResponse.json({
        success,
        message: success ? 'Test email sent successfully' : 'Failed to send test email'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Notification API error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Notification operation failed' },
      { status: 500 }
    )
  }
}