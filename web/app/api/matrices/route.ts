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

  // Vérifier que l'utilisateur peut créer des matrices (admin ou user, pas viewer)
  if (session.user.role === 'viewer') {
    return new NextResponse('Forbidden: Viewers cannot create matrices', { status: 403 })
  }

  try {
    const { name, description } = await req.json()

    if (!name?.trim()) {
      return new NextResponse('Name is required', { status: 400 })
    }

    // Créer la matrice et sa première version dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer la matrice
      const matrix = await tx.matrix.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          ownerId: session.user.id,
          requiredApprovals: 1
        }
      })

      // Créer la première version avec un snapshot vide
      const initialVersion = await tx.matrixVersion.create({
        data: {
          matrixId: matrix.id,
          version: 1,
          status: 'approved',
          note: 'Version initiale créée automatiquement',
          snapshot: { entries: [] }, // Snapshot vide pour commencer
          createdById: session.user.id,
          approvedById: session.user.id,
          approvedAt: new Date(),
          requiredApprovals: 1
        }
      })

      // Lier la version initiale comme version publiée
      const updatedMatrix = await tx.matrix.update({
        where: { id: matrix.id },
        data: { publishedVersionId: initialVersion.id },
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
          }
        }
      })

      return updatedMatrix
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      entity: 'Matrix',
      entityId: result.id,
      action: 'create',
      changes: { name, description, initialVersion: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating matrix:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
