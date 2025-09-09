#!/usr/bin/env npx tsx
/**
 * Script pour importer les templates d'email par défaut en base de données
 * Usage: npx tsx scripts/seed-email-templates.ts
 */

import { PrismaClient } from '@prisma/client'
import { EMAIL_TEMPLATES } from '../lib/email-templates'

const prisma = new PrismaClient()

const defaultTemplates = [
  {
    name: 'change_approval',
    subject: EMAIL_TEMPLATES.CHANGE_APPROVAL.subject,
    htmlContent: EMAIL_TEMPLATES.CHANGE_APPROVAL.html,
    textContent: EMAIL_TEMPLATES.CHANGE_APPROVAL.text,
    variables: ['matrixName', 'requesterName', 'actionType', 'timestamp', 'ipAddress', 'changes', 'url'],
    isActive: true,
    description: 'Template pour les demandes d\'approbation de modifications'
  },
  {
    name: 'change_notification',
    subject: EMAIL_TEMPLATES.CHANGE_NOTIFICATION.subject,
    htmlContent: EMAIL_TEMPLATES.CHANGE_NOTIFICATION.html,
    textContent: EMAIL_TEMPLATES.CHANGE_NOTIFICATION.text,
    variables: ['matrixName', 'approverName', 'actionType', 'timestamp', 'url'],
    isActive: true,
    description: 'Template pour notifier l\'approbation d\'une modification'
  },
  {
    name: 'change_rejection',
    subject: EMAIL_TEMPLATES.CHANGE_REJECTION.subject,
    htmlContent: EMAIL_TEMPLATES.CHANGE_REJECTION.html,
    textContent: EMAIL_TEMPLATES.CHANGE_REJECTION.text,
    variables: ['matrixName', 'approverName', 'actionType', 'timestamp', 'reason', 'url'],
    isActive: true,
    description: 'Template pour notifier le rejet d\'une modification'
  },
  {
    name: 'daily_digest',
    subject: EMAIL_TEMPLATES.DAILY_DIGEST.subject,
    htmlContent: EMAIL_TEMPLATES.DAILY_DIGEST.html,
    textContent: EMAIL_TEMPLATES.DAILY_DIGEST.text,
    variables: ['date', 'totalChanges', 'pendingApprovals', 'recentChanges', 'url', 'unsubscribeUrl'],
    isActive: true,
    description: 'Template pour le digest quotidien d\'activité'
  },
  {
    name: 'security_alert',
    subject: EMAIL_TEMPLATES.SECURITY_ALERT.subject,
    htmlContent: EMAIL_TEMPLATES.SECURITY_ALERT.html,
    textContent: EMAIL_TEMPLATES.SECURITY_ALERT.text,
    variables: ['alertType', 'userName', 'ipAddress', 'actionType', 'timestamp', 'url'],
    isActive: true,
    description: 'Template pour les alertes de sécurité'
  }
]

async function main() {
  console.log('🚀 Importation des templates d\'email par défaut...')

  try {
    // Vérifier si des templates existent déjà
    const existingCount = await prisma.emailTemplate.count()
    console.log(`📊 ${existingCount} template(s) existant(s) en base`)

    let imported = 0
    let skipped = 0

    for (const template of defaultTemplates) {
      const existing = await prisma.emailTemplate.findUnique({
        where: { name: template.name }
      })

      if (existing) {
        console.log(`⏭️  Template '${template.name}' existe déjà, ignoré`)
        skipped++
        continue
      }

      await prisma.emailTemplate.create({
        data: template
      })

      console.log(`✅ Template '${template.name}' importé`)
      imported++
    }

    console.log(`\n📈 Résumé :`)
    console.log(`   • ${imported} template(s) importé(s)`)
    console.log(`   • ${skipped} template(s) ignoré(s)`)
    console.log(`   • ${imported + skipped + existingCount - skipped} template(s) au total`)

    // Afficher les templates actifs
    const activeTemplates = await prisma.emailTemplate.findMany({
      where: { isActive: true },
      select: { name: true, subject: true, variables: true }
    })

    console.log(`\n📧 Templates actifs (${activeTemplates.length}) :`)
    activeTemplates.forEach(template => {
      console.log(`   • ${template.name}: ${template.subject}`)
    })

    console.log('\n🎉 Import terminé avec succès !')

  } catch (error) {
    console.error('❌ Erreur lors de l\'import des templates :', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Erreur fatale :', error)
    process.exit(1)
  })
}

export { main as seedEmailTemplates }