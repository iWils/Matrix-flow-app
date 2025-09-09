import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { EMAIL_TEMPLATES } from '@/lib/email-templates'

// Templates par défaut avec metadata
const DEFAULT_TEMPLATES = [
  {
    id: -1,
    name: 'change_approval',
    subject: EMAIL_TEMPLATES.CHANGE_APPROVAL.subject,
    htmlContent: EMAIL_TEMPLATES.CHANGE_APPROVAL.html,
    textContent: EMAIL_TEMPLATES.CHANGE_APPROVAL.text,
    variables: ['matrixName', 'requesterName', 'actionType', 'timestamp', 'ipAddress', 'changes', 'url'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: -2,
    name: 'change_notification',
    subject: EMAIL_TEMPLATES.CHANGE_NOTIFICATION.subject,
    htmlContent: EMAIL_TEMPLATES.CHANGE_NOTIFICATION.html,
    textContent: EMAIL_TEMPLATES.CHANGE_NOTIFICATION.text,
    variables: ['matrixName', 'approverName', 'actionType', 'timestamp', 'url'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: -3,
    name: 'change_rejection',
    subject: EMAIL_TEMPLATES.CHANGE_REJECTION.subject,
    htmlContent: EMAIL_TEMPLATES.CHANGE_REJECTION.html,
    textContent: EMAIL_TEMPLATES.CHANGE_REJECTION.text,
    variables: ['matrixName', 'approverName', 'actionType', 'timestamp', 'reason', 'url'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: -4,
    name: 'daily_digest',
    subject: EMAIL_TEMPLATES.DAILY_DIGEST.subject,
    htmlContent: EMAIL_TEMPLATES.DAILY_DIGEST.html,
    textContent: EMAIL_TEMPLATES.DAILY_DIGEST.text,
    variables: ['date', 'totalChanges', 'pendingApprovals', 'recentChanges', 'url', 'unsubscribeUrl'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  },
  {
    id: -5,
    name: 'security_alert',
    subject: EMAIL_TEMPLATES.SECURITY_ALERT.subject,
    htmlContent: EMAIL_TEMPLATES.SECURITY_ALERT.html,
    textContent: EMAIL_TEMPLATES.SECURITY_ALERT.text,
    variables: ['alertType', 'userName', 'ipAddress', 'actionType', 'timestamp', 'url'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    isDefault: true
  }
]

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Récupérer les templates depuis la base de données
    const dbTemplates = await prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    })

    // Si aucun template en base, retourner les templates par défaut
    if (dbTemplates.length === 0) {
      return NextResponse.json({
        success: true,
        data: DEFAULT_TEMPLATES,
        message: 'Templates par défaut (non sauvegardés en base)'
      })
    }

    // Combiner templates de base et templates par défaut non overridés
    const dbTemplateNames = new Set(dbTemplates.map(t => t.name))
    const defaultsNotInDb = DEFAULT_TEMPLATES.filter(t => !dbTemplateNames.has(t.name))
    
    const allTemplates = [
      ...dbTemplates.map(t => ({ ...t, isDefault: false })),
      ...defaultsNotInDb
    ].sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      success: true,
      data: allTemplates
    })
  } catch (error) {
    console.error('Error fetching email templates:', error)
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

    const { name, subject, htmlContent, textContent, variables, isActive } = await request.json()

    if (!name?.trim() || !subject?.trim() || !htmlContent?.trim()) {
      return NextResponse.json(
        { error: 'Nom, sujet et contenu HTML sont requis' },
        { status: 400 }
      )
    }

    const template = await prisma.emailTemplate.create({
      data: {
        name: name.trim(),
        subject: subject.trim(),
        htmlContent: htmlContent.trim(),
        textContent: textContent?.trim() || '',
        variables: variables || [],
        isActive: isActive || true
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error creating email template:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}