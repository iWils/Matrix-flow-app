import { prisma } from '@/lib/db'
import { emailService } from '@/lib/email-notifications'

export interface DigestData {
  date: string
  totalChanges: number
  pendingApprovals: number
  recentChanges: Array<{
    matrixName: string
    actionType: string
    userName: string
    timestamp: string
  }>
}

export class DigestService {
  // Générer les données pour un digest quotidien
  static async generateDailyDigestData(date: Date = new Date()): Promise<DigestData> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    // Compter les modifications du jour
    const totalChanges = await prisma.auditLog.count({
      where: {
        at: {
          gte: startOfDay,
          lte: endOfDay
        },
        action: {
          in: ['create', 'update', 'delete']
        }
      }
    })

    // Compter les approbations en attente
    const pendingApprovals = await prisma.changeRequest.count({
      where: {
        status: 'pending'
      }
    })

    // Récupérer les modifications récentes avec détails
    const recentChanges = await prisma.auditLog.findMany({
      where: {
        at: {
          gte: startOfDay,
          lte: endOfDay
        },
        action: {
          in: ['create', 'update', 'delete']
        }
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        at: 'desc'
      },
      take: 10
    })

    const formattedChanges = recentChanges.map(change => ({
      matrixName: change.entity || 'Système',
      actionType: this.formatActionType(change.action),
      userName: change.user?.fullName || 'Système',
      timestamp: change.at.toLocaleString('fr-FR')
    }))

    return {
      date: date.toLocaleDateString('fr-FR'),
      totalChanges,
      pendingApprovals,
      recentChanges: formattedChanges
    }
  }

  // Envoyer le digest quotidien aux utilisateurs abonnés
  static async sendDailyDigest(date: Date = new Date()): Promise<{
    sent: number
    failed: number
    errors: string[]
  }> {
    try {
      // Vérifier si les digests sont activés
      const digestSetting = await prisma.systemSetting.findUnique({
        where: { key: 'digest_frequency' }
      })

      if (!digestSetting || digestSetting.value !== 'daily') {
        return { sent: 0, failed: 0, errors: ['Daily digest disabled'] }
      }

      // Générer les données du digest
      const digestData = await this.generateDailyDigestData(date)

      // Récupérer les utilisateurs qui veulent recevoir le digest
      // Pour maintenant, on envoie aux admins - plus tard on peut ajouter des préférences utilisateur
      const adminUsers = await prisma.user.findMany({
        where: {
          role: 'admin',
          isActive: true
        },
        select: {
          email: true,
          fullName: true
        }
      })

      let sent = 0
      let failed = 0
      const errors: string[] = []

      for (const admin of adminUsers) {
        try {
          const success = await emailService.sendDailyDigest({
            ...digestData,
            recipientEmail: admin.email || ''
          })

          if (success) {
            sent++
          } else {
            failed++
            errors.push(`Failed to send to ${admin.email}`)
          }
        } catch (error) {
          failed++
          errors.push(`Error sending to ${admin.email}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Log du résultat
      console.info(`Daily digest sent: ${sent} successful, ${failed} failed`, { 
        date: date.toISOString(),
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined
      })

      return { sent, failed, errors }

    } catch (error) {
      console.error('Error generating daily digest:', error)
      return {
        sent: 0,
        failed: 0,
        errors: [`Digest generation error: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  // Programmer l'envoi automatique du digest quotidien
  static scheduleDaily(): void {
    // Calculer le délai jusqu'à 9h00 le lendemain
    const now = new Date()
    const tomorrow9AM = new Date(now)
    tomorrow9AM.setDate(tomorrow9AM.getDate() + 1)
    tomorrow9AM.setHours(9, 0, 0, 0)
    
    const delay = tomorrow9AM.getTime() - now.getTime()

    setTimeout(() => {
      this.sendDailyDigest()
        .then(result => {
          console.info('Scheduled daily digest completed', result)
        })
        .catch(error => {
          console.error('Scheduled daily digest failed', error)
        })
      
      // Programmer le suivant (24h plus tard)
      setInterval(() => {
        this.sendDailyDigest()
          .then(result => {
            console.info('Daily digest completed', result)
          })
          .catch(error => {
            console.error('Daily digest failed', error)
          })
      }, 24 * 60 * 60 * 1000) // 24 heures
      
    }, delay)

    console.info(`Daily digest scheduled for ${tomorrow9AM.toLocaleString('fr-FR')}`)
  }

  // Helper pour formater les types d'action
  private static formatActionType(action: string): string {
    const actionMap: Record<string, string> = {
      'create': 'Création',
      'update': 'Modification',
      'delete': 'Suppression',
      'approve': 'Approbation',
      'reject': 'Rejet',
      'import': 'Import',
      'export': 'Export',
      'batch_update': 'Modification en lot',
      'batch_delete': 'Suppression en lot'
    }

    return actionMap[action] || action
  }

  // Envoyer un digest hebdomadaire (optionnel)
  static async sendWeeklyDigest(): Promise<{
    sent: number
    failed: number
    errors: string[]
  }> {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    // Logique similaire au digest quotidien mais sur 7 jours
    // Implementation simplified for now
    return this.sendDailyDigest(weekAgo)
  }
}

// Auto-démarrer le scheduler si en production et pas dans l'edge runtime
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_RUNTIME) {
  DigestService.scheduleDaily()
}

export default DigestService