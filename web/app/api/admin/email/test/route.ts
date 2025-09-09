import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { emailService } from '@/lib/email-notifications'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user) {
    logger.warn('Unauthorized attempt to test email', {
      endpoint: '/api/admin/email/test',
      method: 'POST',
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent')
    })
    return NextResponse.json({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  if (session.user.role !== 'admin') {
    logger.warn('Non-admin user attempted to test email', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/admin/email/test',
      method: 'POST'
    })
    return NextResponse.json({
      success: false,
      message: 'Admin access required'
    }, { status: 403 })
  }

  try {
    logger.info('Starting email test', {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/email/test',
      method: 'POST'
    })

    const body = await request.json()
    const { testEmail, templateType = 'test' } = body

    // Validation de l'email de test
    if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
      return NextResponse.json({
        success: false,
        message: 'Adresse email de test invalide'
      }, { status: 400 })
    }

    // Initialiser le service email
    await emailService.initialize()

    // Vérifier la santé du service
    const isHealthy = await emailService.isHealthy()
    if (!isHealthy) {
      return NextResponse.json({
        success: false,
        message: 'Service email non configuré ou indisponible'
      }, { status: 400 })
    }

    let testResult = false

    // Envoyer différents types de test selon le template choisi
    switch (templateType) {
      case 'change_approval':
        testResult = await emailService.sendChangeApprovalRequest({
          matrixName: 'Matrix Test',
          requesterName: session.user.name || session.user.email || 'Utilisateur Test',
          actionType: 'create',
          changes: 'Test de template - Demande d\'approbation',
          changeRequestId: 1,
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
        })
        break

      case 'change_notification':
        testResult = await emailService.sendChangeNotification({
          matrixName: 'Matrix Test',
          actionType: 'approved',
          approverName: 'Admin Test',
          matrixId: 1,
          recipientEmail: testEmail
        })
        break

      case 'security_alert':
        testResult = await emailService.sendSecurityAlert({
          alertType: 'Test de sécurité',
          userName: session.user.name || session.user.email || 'Utilisateur Test',
          actionType: 'login_attempt',
          ipAddress: request.headers.get('x-forwarded-for') || '127.0.0.1'
        })
        break

      case 'daily_digest':
        testResult = await emailService.sendDailyDigest({
          date: new Date().toLocaleDateString('fr-FR'),
          totalChanges: 5,
          pendingApprovals: 2,
          recentChanges: [
            {
              matrixName: 'Matrix Test 1',
              actionType: 'create',
              userName: 'User 1',
              timestamp: new Date().toLocaleString('fr-FR')
            },
            {
              matrixName: 'Matrix Test 2',
              actionType: 'update',
              userName: 'User 2', 
              timestamp: new Date().toLocaleString('fr-FR')
            }
          ],
          recipientEmail: testEmail
        })
        break

      default:
        // Test basique avec template par défaut
        testResult = await emailService.sendTestEmail(testEmail)
        break
    }

    if (testResult) {
      // Log de l'audit
      await auditLog({
        userId: parseInt(session.user.id as string),
        entity: 'EmailTest',
        entityId: 0,
        action: 'test',
        changes: {
          testEmail,
          templateType,
          success: true
        }
      })

      logger.info('Email test sent successfully', {
        userId: parseInt(session.user.id as string),
        testEmail,
        templateType,
        success: true
      })

      return NextResponse.json({
        success: true,
        message: `Email de test envoyé avec succès à ${testEmail}`
      })
    } else {
      logger.warn('Email test failed', {
        userId: parseInt(session.user.id as string),
        testEmail,
        templateType,
        success: false
      })

      return NextResponse.json({
        success: false,
        message: 'Échec de l\'envoi de l\'email de test'
      }, { status: 500 })
    }

  } catch (error) {
    logger.error('Error during email test', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/admin/email/test',
      method: 'POST'
    })

    return NextResponse.json({
      success: false,
      message: 'Erreur lors du test d\'email'
    }, { status: 500 })
  }
}