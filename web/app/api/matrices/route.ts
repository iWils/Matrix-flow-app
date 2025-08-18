import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { CreateMatrixSchema } from '@/lib/validate'
import { Matrix, ApiResponse } from '@/types'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized access attempt to matrices', {
      endpoint: '/api/matrices'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }

  try {
    logger.info('Fetching matrices', {
      userId: session.user.id,
      userRole: session.user.role
    })

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

    logger.info('Matrices fetched successfully', {
      userId: session.user.id,
      matrixCount: matrices.length
    })

    const response: ApiResponse<typeof matrices> = {
      success: true,
      data: matrices
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching matrices', error as Error, {
      userId: session.user.id,
      endpoint: '/api/matrices'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized access attempt to create matrix', {
      endpoint: '/api/matrices'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }

  // Vérifier que l'utilisateur peut créer des matrices (admin ou user, pas viewer)
  if (session.user.role === 'viewer') {
    logger.warn('Viewer attempted to create matrix', {
      userId: session.user.id,
      userRole: session.user.role,
      endpoint: '/api/matrices'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Forbidden: Viewers cannot create matrices'
    }
    
    return NextResponse.json(errorResponse, { status: 403 })
  }

  try {
    const body = await req.json()
    
    // Validation avec Zod
    const validationResult = CreateMatrixSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid matrix creation data', {
        userId: session.user.id,
        errors: validationResult.error.errors,
        body
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Données invalides',
        message: validationResult.error.errors[0]?.message
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { name, description, requiredApprovals = 1 } = validationResult.data

    logger.info('Creating new matrix', {
      userId: session.user.id,
      matrixName: name,
      requiredApprovals
    })

    // Créer la matrice et sa première version dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer la matrice
      const matrix = await tx.matrix.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          ownerId: session.user.id,
          requiredApprovals
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
          requiredApprovals
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
      changes: { name, description, requiredApprovals, initialVersion: true }
    })

    logger.info('Matrix created successfully', {
      userId: session.user.id,
      matrixId: result.id,
      matrixName: result.name
    })

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Matrice créée avec succès'
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error creating matrix', error as Error, {
      userId: session.user.id,
      endpoint: '/api/matrices'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}
