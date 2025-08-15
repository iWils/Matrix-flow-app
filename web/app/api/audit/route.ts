import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier que l'utilisateur est admin
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Récupérer tous les logs d'audit
    const auditLogs = await prisma.auditLog.findMany({
      include: {
        user: {
          select: {
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        at: 'desc'
      },
      take: 100 // Limiter à 100 entrées pour éviter de surcharger
    })

    // Transformer les données pour correspondre au format attendu
    const formattedLogs = auditLogs.map((log: any) => ({
      id: log.id,
      entity: log.entity,
      action: log.action,
      at: log.at.toISOString(),
      user: log.user ? {
        username: log.user.username,
        fullName: log.user.fullName
      } : null,
      changes: log.changes
    }))

    return NextResponse.json(formattedLogs)
  } catch (error) {
    console.error('Erreur lors de la récupération des logs d\'audit:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  }
}