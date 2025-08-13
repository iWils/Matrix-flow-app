import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { canEditMatrix } from '@/lib/rbac'

export async function GET(
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
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      include: {
        owner: {
          select: {
            username: true,
            fullName: true
          }
        },
        publishedVersion: true,
        entries: {
          orderBy: { createdAt: 'desc' }
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 5
        },
        permissions: {
          include: {
            user: {
              select: {
                username: true,
                fullName: true
              }
            }
          }
        }
      }
    })

    if (!matrix) {
      return new NextResponse('Matrix not found', { status: 404 })
    }

    return NextResponse.json(matrix)
  } catch (error) {
    console.error('Error fetching matrix:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function PUT(
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

    const { name, description } = await req.json()

    const matrix = await prisma.matrix.update({
      where: { id: matrixId },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        updatedAt: new Date()
      }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'Matrix',
      entityId: matrixId,
      action: 'update',
      changes: { name, description }
    })

    return NextResponse.json(matrix)
  } catch (error) {
    console.error('Error updating matrix:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  if (isNaN(matrixId)) {
    return new NextResponse('Invalid matrix ID', { status: 400 })
  }

  try {
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      select: { name: true }
    })

    if (!matrix) {
      return new NextResponse('Matrix not found', { status: 404 })
    }

    await prisma.matrix.delete({
      where: { id: matrixId }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      entity: 'Matrix',
      entityId: matrixId,
      action: 'delete',
      changes: { name: matrix.name }
    })

    return new NextResponse('Matrix deleted', { status: 200 })
  } catch (error) {
    console.error('Error deleting matrix:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}