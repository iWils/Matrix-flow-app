import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  // Seuls les admins peuvent approuver/rejeter les demandes
  if (session.user.role !== 'admin') {
    return new NextResponse('Forbidden: Only admins can review change requests', { status: 403 })
  }

  const resolvedParams = await params
  const requestId = parseInt(resolvedParams.id)
  if (isNaN(requestId)) {
    return new NextResponse('Invalid request ID', { status: 400 })
  }

  try {
    const { action, reviewComment } = await req.json()

    if (!action || !['approve', 'reject'].includes(action)) {
      return new NextResponse('Invalid action. Must be "approve" or "reject"', { status: 400 })
    }

    // Récupérer la demande de changement
    const changeRequest = await prisma.changeRequest.findUnique({
      where: { id: requestId },
      include: {
        matrix: true,
        entry: true
      }
    })

    if (!changeRequest) {
      return new NextResponse('Change request not found', { status: 404 })
    }

    if (changeRequest.status !== 'pending') {
      return new NextResponse('Change request already reviewed', { status: 400 })
    }

    // Utiliser une transaction pour garantir la cohérence
    const result = await prisma.$transaction(async (tx) => {
      // Mettre à jour la demande de changement
      const updatedRequest = await tx.changeRequest.update({
        where: { id: requestId },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewedById: session.user.id,
          reviewedAt: new Date(),
          reviewComment: reviewComment || null
        },
        include: {
          matrix: {
            select: {
              name: true
            }
          },
          requestedBy: {
            select: {
              username: true,
              fullName: true
            }
          },
          reviewedBy: {
            select: {
              username: true,
              fullName: true
            }
          }
        }
      })

      // Si approuvé, appliquer les changements
      if (action === 'approve') {
        const requestedData = changeRequest.requestedData as any

        switch (changeRequest.requestType) {
          case 'create_entry':
            // Créer une nouvelle entrée
            await tx.flowEntry.create({
              data: {
                matrixId: changeRequest.matrixId,
                ...requestedData,
                implementation_date: requestedData.implementation_date ? new Date(requestedData.implementation_date) : null
              }
            })
            break

          case 'update_entry':
            // Mettre à jour l'entrée existante
            if (changeRequest.entryId) {
              await tx.flowEntry.update({
                where: { id: changeRequest.entryId },
                data: {
                  ...requestedData,
                  implementation_date: requestedData.implementation_date ? new Date(requestedData.implementation_date) : null,
                  updatedAt: new Date()
                }
              })
            }
            break

          case 'delete_entry':
            // Supprimer l'entrée
            if (changeRequest.entryId) {
              await tx.flowEntry.delete({
                where: { id: changeRequest.entryId }
              })
            }
            break
        }
      }

      return updatedRequest
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId: changeRequest.matrixId,
      entity: 'ChangeRequest',
      entityId: requestId,
      action: 'update',
      changes: { action, reviewComment, applied: action === 'approve' }
    })

    // Formater la réponse
    const formattedResponse = {
      id: result.id,
      matrixId: result.matrixId,
      matrixName: result.matrix.name,
      requestType: result.requestType,
      status: result.status,
      requestedBy: {
        username: result.requestedBy.username,
        fullName: result.requestedBy.fullName
      },
      requestedAt: result.requestedAt.toISOString(),
      reviewedBy: result.reviewedBy ? {
        username: result.reviewedBy.username,
        fullName: result.reviewedBy.fullName
      } : undefined,
      reviewedAt: result.reviewedAt?.toISOString(),
      description: result.description,
      changes: result.requestedData,
      reviewComment: result.reviewComment
    }

    return NextResponse.json(formattedResponse)
  } catch (error) {
    console.error('Error updating change request:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}