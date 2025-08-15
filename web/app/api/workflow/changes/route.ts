import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const changeRequests = await prisma.changeRequest.findMany({
      include: {
        matrix: {
          select: {
            name: true
          }
        },
        entry: {
          select: {
            rule_name: true
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
      },
      orderBy: {
        requestedAt: 'desc'
      }
    })

    // Transformer les données pour correspondre au format attendu par l'interface
    const formattedRequests = changeRequests.map(request => ({
      id: request.id,
      matrixId: request.matrixId,
      matrixName: request.matrix.name,
      requestType: request.requestType,
      status: request.status,
      requestedBy: {
        username: request.requestedBy.username,
        fullName: request.requestedBy.fullName
      },
      requestedAt: request.requestedAt.toISOString(),
      reviewedBy: request.reviewedBy ? {
        username: request.reviewedBy.username,
        fullName: request.reviewedBy.fullName
      } : undefined,
      reviewedAt: request.reviewedAt?.toISOString(),
      description: request.description,
      changes: request.requestedData,
      reviewComment: request.reviewComment
    }))

    return NextResponse.json(formattedRequests)
  } catch (error) {
    console.error('Error fetching change requests:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { matrixId, entryId, requestType, description, requestedData } = await req.json()

    if (!matrixId || !requestType || !description || !requestedData) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    // Vérifier que la matrice existe
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      select: { name: true }
    })

    if (!matrix) {
      return new NextResponse('Matrix not found', { status: 404 })
    }

    // Vérifier que l'entrée existe si c'est une modification/suppression
    if ((requestType === 'update_entry' || requestType === 'delete_entry') && entryId) {
      const entry = await prisma.flowEntry.findUnique({
        where: { id: entryId, matrixId }
      })

      if (!entry) {
        return new NextResponse('Entry not found', { status: 404 })
      }
    }

    const changeRequest = await prisma.changeRequest.create({
      data: {
        matrixId,
        entryId: entryId || null,
        requestType,
        description,
        requestedData,
        requestedById: session.user.id
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
        }
      }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'ChangeRequest',
      entityId: changeRequest.id,
      action: 'create',
      changes: { requestType, description }
    })

    // Formater la réponse
    const formattedRequest = {
      id: changeRequest.id,
      matrixId: changeRequest.matrixId,
      matrixName: changeRequest.matrix.name,
      requestType: changeRequest.requestType,
      status: changeRequest.status,
      requestedBy: {
        username: changeRequest.requestedBy.username,
        fullName: changeRequest.requestedBy.fullName
      },
      requestedAt: changeRequest.requestedAt.toISOString(),
      description: changeRequest.description,
      changes: changeRequest.requestedData
    }

    return NextResponse.json(formattedRequest)
  } catch (error) {
    console.error('Error creating change request:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}