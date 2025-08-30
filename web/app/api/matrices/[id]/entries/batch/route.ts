import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { checkMatrixPermission } from '@/lib/rbac'
import { logAudit } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = await params
    const matrixId = parseInt(resolvedParams.id)
    if (isNaN(matrixId)) {
      return NextResponse.json({ error: 'ID matrice invalide' }, { status: 400 })
    }

    // Vérifier les permissions
    const canEdit = await checkMatrixPermission(parseInt(session.user.id), matrixId, 'edit')
    if (!canEdit) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const body = await req.json()
    const { action, entryIds, updates } = body

    if (!action || !Array.isArray(entryIds) || entryIds.length === 0) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const result: Record<string, unknown> = { success: true, processed: 0 }

    switch (action) {
      case 'delete':
        // Supprimer les entrées sélectionnées
        const deletedEntries = await prisma.flowEntry.deleteMany({
          where: {
            id: { in: entryIds },
            matrixId: matrixId
          }
        })

        result.processed = deletedEntries.count

        // Audit log
        await logAudit({
          userId: parseInt(session.user.id),
          action: 'delete',
          resource: 'flowEntry',
          resourceId: matrixId.toString(),
          details: {
            deletedCount: deletedEntries.count,
            entryIds: entryIds
          }
        })
        break

      case 'update':
        if (!updates || typeof updates !== 'object') {
          return NextResponse.json({ error: 'Données de mise à jour manquantes' }, { status: 400 })
        }

        // Filtrer les champs vides
        const cleanUpdates = Object.fromEntries(
          Object.entries(updates).filter(([, value]) => 
            value !== null && value !== undefined && value !== ''
          )
        )

        if (Object.keys(cleanUpdates).length === 0) {
          return NextResponse.json({ error: 'Aucune mise à jour fournie' }, { status: 400 })
        }

        // Mettre à jour les entrées sélectionnées
        const updatedEntries = await prisma.flowEntry.updateMany({
          where: {
            id: { in: entryIds },
            matrixId: matrixId
          },
          data: {
            ...cleanUpdates,
            updatedAt: new Date()
          }
        })

        result.processed = updatedEntries.count

        // Audit log
        await logAudit({
          userId: parseInt(session.user.id),
          action: 'update',
          resource: 'flowEntry',
          resourceId: matrixId.toString(),
          details: {
            updatedCount: updatedEntries.count,
            entryIds: entryIds,
            updates: cleanUpdates
          }
        })
        break

      case 'export':
        // Récupérer les entrées sélectionnées avec leurs détails
        const entries = await prisma.flowEntry.findMany({
          where: {
            id: { in: entryIds },
            matrixId: matrixId
          },
          include: {
            matrix: {
              select: { name: true }
            }
          }
        })

        result.data = entries
        result.processed = entries.length
        break

      default:
        return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error) {
    console.error('Batch operation error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'opération en lot' },
      { status: 500 }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = await params
    const matrixId = parseInt(resolvedParams.id)
    if (isNaN(matrixId)) {
      return NextResponse.json({ error: 'ID matrice invalide' }, { status: 400 })
    }

    // Vérifier les permissions
    const canView = await checkMatrixPermission(parseInt(session.user.id), matrixId, 'view')
    if (!canView) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const entryIds = searchParams.get('ids')?.split(',').map(id => parseInt(id)).filter(id => !isNaN(id))

    if (!entryIds || entryIds.length === 0) {
      return NextResponse.json({ error: 'IDs d\'entrées manquants' }, { status: 400 })
    }

    // Récupérer les entrées sélectionnées
    const entries = await prisma.flowEntry.findMany({
      where: {
        id: { in: entryIds },
        matrixId: matrixId
      },
      include: {
        matrix: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      success: true,
      data: entries
    })

  } catch (error) {
    console.error('Batch get error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des entrées' },
      { status: 500 }
    )
  }
}