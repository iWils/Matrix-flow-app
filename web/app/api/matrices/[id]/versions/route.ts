import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canEditMatrix } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  if (isNaN(matrixId)) {
    return new NextResponse('Invalid matrix ID', { status: 400 })
  }

  try {
    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const { note } = await req.json()

    // Get current matrix data
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      include: {
        entries: true,
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    })

    if (!matrix) {
      return new NextResponse('Matrix not found', { status: 404 })
    }

    const nextVersion = (matrix.versions[0]?.version || 0) + 1

    // Create snapshot
    const snapshot = {
      entries: matrix.entries,
      metadata: {
        name: matrix.name,
        description: matrix.description,
        createdAt: new Date()
      }
    }

    const version = await prisma.matrixVersion.create({
      data: {
        matrixId,
        version: nextVersion,
        note: note?.trim() || null,
        snapshot,
        createdById: session.user.id,
        requiredApprovals: matrix.requiredApprovals
      }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'MatrixVersion',
      entityId: version.id,
      action: 'create',
      changes: {
        version: nextVersion,
        note,
        entriesCount: matrix.entries.length
      }
    })

    return NextResponse.json(version)
  } catch (error) {
    console.error('Error creating version:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}