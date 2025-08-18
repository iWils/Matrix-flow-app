import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { canEditMatrix } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { UpdateMatrixSchema } from '@/lib/validate'
import { Matrix, ApiResponse } from '@/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized access attempt to matrix details', {
      endpoint: `/api/matrices/[id]`,
      method: 'GET'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  if (isNaN(matrixId)) {
    logger.warn('Invalid matrix ID provided', {
      userId: session.user.id,
      providedId: resolvedParams.id,
      endpoint: `/api/matrices/[id]`
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Invalid matrix ID'
    }
    
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    logger.info('Fetching matrix details', {
      userId: session.user.id,
      matrixId,
      userRole: session.user.role
    })

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
      logger.warn('Matrix not found', {
        userId: session.user.id,
        matrixId,
        endpoint: `/api/matrices/${matrixId}`
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Matrix not found'
      }
      
      return NextResponse.json(errorResponse, { status: 404 })
    }

    logger.info('Matrix details fetched successfully', {
      userId: session.user.id,
      matrixId,
      matrixName: matrix.name,
      entriesCount: matrix.entries.length,
      versionsCount: matrix.versions.length
    })

    const response: ApiResponse<typeof matrix> = {
      success: true,
      data: matrix
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error fetching matrix details', error as Error, {
      userId: session.user.id,
      matrixId,
      endpoint: `/api/matrices/${matrixId}`
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized access attempt to update matrix', {
      endpoint: `/api/matrices/[id]`,
      method: 'PUT'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  if (isNaN(matrixId)) {
    logger.warn('Invalid matrix ID provided for update', {
      userId: session.user.id,
      providedId: resolvedParams.id,
      endpoint: `/api/matrices/[id]`
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Invalid matrix ID'
    }
    
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    logger.info('Checking edit permissions for matrix', {
      userId: session.user.id,
      matrixId,
      userRole: session.user.role
    })

    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      logger.warn('User attempted to edit matrix without permission', {
        userId: session.user.id,
        matrixId,
        userRole: session.user.role
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Forbidden: Insufficient permissions to edit this matrix'
      }
      
      return NextResponse.json(errorResponse, { status: 403 })
    }

    const body = await req.json()
    
    // Validation avec Zod
    const validationResult = UpdateMatrixSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid matrix update data', {
        userId: session.user.id,
        matrixId,
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

    const { name, description, requiredApprovals } = validationResult.data

    logger.info('Updating matrix', {
      userId: session.user.id,
      matrixId,
      changes: { name, description, requiredApprovals }
    })

    const matrix = await prisma.matrix.update({
      where: { id: matrixId },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(requiredApprovals && { requiredApprovals }),
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
      changes: { name, description, requiredApprovals }
    })

    logger.info('Matrix updated successfully', {
      userId: session.user.id,
      matrixId,
      matrixName: matrix.name
    })

    const response: ApiResponse<typeof matrix> = {
      success: true,
      data: matrix,
      message: 'Matrice mise à jour avec succès'
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error updating matrix', error as Error, {
      userId: session.user.id,
      matrixId,
      endpoint: `/api/matrices/${matrixId}`
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    logger.warn('Unauthorized deletion attempt', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      endpoint: `/api/matrices/[id]`,
      method: 'DELETE'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized: Admin access required'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  if (isNaN(matrixId)) {
    logger.warn('Invalid matrix ID provided for deletion', {
      userId: session.user.id,
      providedId: resolvedParams.id,
      endpoint: `/api/matrices/[id]`
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Invalid matrix ID'
    }
    
    return NextResponse.json(errorResponse, { status: 400 })
  }

  try {
    logger.info('Attempting to delete matrix', {
      userId: session.user.id,
      matrixId,
      userRole: session.user.role
    })

    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      select: { name: true, ownerId: true }
    })

    if (!matrix) {
      logger.warn('Matrix not found for deletion', {
        userId: session.user.id,
        matrixId,
        endpoint: `/api/matrices/${matrixId}`
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Matrix not found'
      }
      
      return NextResponse.json(errorResponse, { status: 404 })
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
      changes: { name: matrix.name, ownerId: matrix.ownerId }
    })

    logger.info('Matrix deleted successfully', {
      userId: session.user.id,
      matrixId,
      matrixName: matrix.name,
      originalOwnerId: matrix.ownerId
    })

    const response: ApiResponse = {
      success: true,
      message: `Matrice "${matrix.name}" supprimée avec succès`
    }

    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error deleting matrix', error as Error, {
      userId: session.user.id,
      matrixId,
      endpoint: `/api/matrices/${matrixId}`
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}