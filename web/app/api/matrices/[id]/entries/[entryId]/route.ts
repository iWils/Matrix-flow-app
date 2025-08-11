import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { canEditMatrix } from '@/lib/rbac'

interface RouteParams {
  params: {
    id: string
    entryId: string
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const matrixId = parseInt(params.id)
  const entryId = parseInt(params.entryId)
  
  if (isNaN(matrixId) || isNaN(entryId)) {
    return new NextResponse('Invalid IDs', { status: 400 })
  }

  try {
    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const entryData = await req.json()

    const entry = await prisma.flowEntry.update({
      where: { id: entryId, matrixId },
      data: {
        ...entryData,
        implementation_date: entryData.implementation_date ? new Date(entryData.implementation_date) : null,
        updatedAt: new Date()
      }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'FlowEntry',
      entityId: entryId,
      action: 'update',
      changes: entryData
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Error updating entry:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const matrixId = parseInt(params.id)
  const entryId = parseInt(params.entryId)
  
  if (isNaN(matrixId) || isNaN(entryId)) {
    return new NextResponse('Invalid IDs', { status: 400 })
  }

  try {
    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const entry = await prisma.flowEntry.findUnique({
      where: { id: entryId, matrixId },
      select: { rule_name: true }
    })

    if (!entry) {
      return new NextResponse('Entry not found', { status: 404 })
    }

    await prisma.flowEntry.delete({
      where: { id: entryId, matrixId }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'FlowEntry',
      entityId: entryId,
      action: 'delete',
      changes: { rule_name: entry.rule_name }
    })

    return new NextResponse('Entry deleted', { status: 200 })
  } catch (error) {
    console.error('Error deleting entry:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
