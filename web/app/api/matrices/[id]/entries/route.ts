import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { canEditMatrix } from '@/lib/rbac'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const matrixId = parseInt(params.id)
  if (isNaN(matrixId)) {
    return new NextResponse('Invalid matrix ID', { status: 400 })
  }

  try {
    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const entryData = await req.json()

    const entry = await prisma.flowEntry.create({
      data: {
        matrixId,
        ...entryData,
        implementation_date: entryData.implementation_date ? new Date(entryData.implementation_date) : null
      }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'FlowEntry',
      entityId: entry.id,
      action: 'create',
      changes: entryData
    })

    return NextResponse.json(entry)
  } catch (error) {
    console.error('Error creating entry:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
