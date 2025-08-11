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
    const matrices = await prisma.matrix.findMany({
      include: {
        owner: {
          select: {
            username: true,
            fullName: true
          }
        },
        publishedVersion: {
          select: {
            version: true,
            status: true
          }
        },
        _count: {
          select: {
            entries: true,
            versions: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json(matrices)
  } catch (error) {
    console.error('Error fetching matrices:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    const { name, description } = await req.json()

    if (!name?.trim()) {
      return new NextResponse('Name is required', { status: 400 })
    }

    const matrix = await prisma.matrix.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: session.user.id,
        requiredApprovals: 1
      },
      include: {
        owner: {
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
      entity: 'Matrix',
      entityId: matrix.id,
      action: 'create',
      changes: { name, description }
    })

    return NextResponse.json(matrix)
  } catch (error) {
    console.error('Error creating matrix:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
