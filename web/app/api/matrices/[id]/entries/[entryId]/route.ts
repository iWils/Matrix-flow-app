import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { canEditMatrix } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { UpdateMatrixEntrySchema } from '@/lib/validate'
import { ApiResponse, MatrixEntry } from '@/types'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to update matrix entry', {
      endpoint: '/api/matrices/[id]/entries/[entryId]',
      method: 'PUT',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  const entryId = parseInt(resolvedParams.entryId)
  
  if (isNaN(matrixId) || isNaN(entryId)) {
    logger.warn('Invalid IDs provided for entry update', {
      userId: parseInt(session.user.id as string),
      providedMatrixId: resolvedParams.id,
      providedEntryId: resolvedParams.entryId,
      endpoint: '/api/matrices/[id]/entries/[entryId]'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Invalid matrix or entry ID'
    }, { status: 400 })
  }

  try {
    logger.info('Starting matrix entry update', {
      userId: parseInt(session.user.id as string),
      matrixId,
      entryId,
      endpoint: '/api/matrices/[id]/entries/[entryId]',
      method: 'PUT'
    })

    // Check matrix edit permissions
    const canEdit = await canEditMatrix(parseInt(session.user.id as string), session.user.role, matrixId)
    if (!canEdit) {
      logger.warn('User lacks permission to update matrix entry', {
        userId: parseInt(session.user.id as string),
        userRole: session.user.role,
        matrixId,
        entryId,
        action: 'update_entry'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Insufficient permissions to update entries in this matrix'
      }, { status: 403 })
    }

    // Verify entry exists and get current data
    const existingEntry = await prisma.flowEntry.findUnique({
      where: { id: entryId, matrixId },
      include: {
        matrix: {
          select: { name: true }
        }
      }
    })

    if (!existingEntry) {
      logger.warn('Entry not found for update', {
        userId: parseInt(session.user.id as string),
        matrixId,
        entryId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Entry not found'
      }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = UpdateMatrixEntrySchema.parse(body)

    // Check for duplicate rule names if rule_name is being updated
    if (validatedData.rule_name && validatedData.rule_name !== existingEntry.rule_name) {
      const duplicateEntry = await prisma.flowEntry.findFirst({
        where: {
          matrixId,
          rule_name: validatedData.rule_name,
          id: { not: entryId }
        }
      })

      if (duplicateEntry) {
        logger.warn('Duplicate rule name attempted during update', {
          userId: parseInt(session.user.id as string),
          matrixId,
          entryId,
          newRuleName: validatedData.rule_name,
          conflictingEntryId: duplicateEntry.id
        })
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'A rule with this name already exists in the matrix'
        }, { status: 409 })
      }
    }

    const updatedEntry = await prisma.flowEntry.update({
      where: { id: entryId, matrixId },
      data: {
        ...validatedData,
        implementation_date: validatedData.implementation_date
          ? new Date(validatedData.implementation_date)
          : undefined,
        updatedAt: new Date()
      }
    })

    // Comprehensive audit log
    await auditLog({
      userId: parseInt(session.user.id as string),
      matrixId,
      entity: 'FlowEntry',
      entityId: entryId,
      action: 'update',
      changes: {
        previousData: {
          rule_name: existingEntry.rule_name,
          device: existingEntry.device,
          comment: existingEntry.comment
        },
        newData: validatedData,
        matrixName: existingEntry.matrix.name
      }
    })

    const formattedEntry: MatrixEntry = {
      id: updatedEntry.id,
      matrixId: updatedEntry.matrixId,
      row: updatedEntry.rule_name || '',
      column: updatedEntry.device || '',
      value: updatedEntry.comment || '',
      createdAt: updatedEntry.createdAt,
      updatedAt: updatedEntry.updatedAt
    }

    logger.info('Matrix entry updated successfully', {
      userId: parseInt(session.user.id as string),
      entryId,
      matrixId,
      matrixName: existingEntry.matrix.name,
      previousRuleName: existingEntry.rule_name,
      newRuleName: validatedData.rule_name,
      fieldsUpdated: Object.keys(validatedData).length
    })

    return NextResponse.json<ApiResponse<MatrixEntry>>({
      success: true,
      data: formattedEntry,
      message: 'Matrix entry updated successfully'
    })

  } catch (error) {
    logger.error('Error updating matrix entry', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      matrixId,
      entryId,
      endpoint: '/api/matrices/[id]/entries/[entryId]',
      method: 'PUT'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to update matrix entry'
    }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to delete matrix entry', {
      endpoint: '/api/matrices/[id]/entries/[entryId]',
      method: 'DELETE',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  const entryId = parseInt(resolvedParams.entryId)
  
  if (isNaN(matrixId) || isNaN(entryId)) {
    logger.warn('Invalid IDs provided for entry deletion', {
      userId: parseInt(session.user.id as string),
      providedMatrixId: resolvedParams.id,
      providedEntryId: resolvedParams.entryId,
      endpoint: '/api/matrices/[id]/entries/[entryId]'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Invalid matrix or entry ID'
    }, { status: 400 })
  }

  try {
    logger.info('Starting matrix entry deletion', {
      userId: parseInt(session.user.id as string),
      matrixId,
      entryId,
      endpoint: '/api/matrices/[id]/entries/[entryId]',
      method: 'DELETE'
    })

    // Check matrix edit permissions
    const canEdit = await canEditMatrix(parseInt(session.user.id as string), session.user.role, matrixId)
    if (!canEdit) {
      logger.warn('User lacks permission to delete matrix entry', {
        userId: parseInt(session.user.id as string),
        userRole: session.user.role,
        matrixId,
        entryId,
        action: 'delete_entry'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Insufficient permissions to delete entries in this matrix'
      }, { status: 403 })
    }

    // Verify entry exists and get data for audit trail
    const entry = await prisma.flowEntry.findUnique({
      where: { id: entryId, matrixId },
      include: {
        matrix: {
          select: { name: true }
        }
      }
    })

    if (!entry) {
      logger.warn('Entry not found for deletion', {
        userId: parseInt(session.user.id as string),
        matrixId,
        entryId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Entry not found'
      }, { status: 404 })
    }

    // Delete the entry
    await prisma.flowEntry.delete({
      where: { id: entryId, matrixId }
    })

    // Comprehensive audit log
    await auditLog({
      userId: parseInt(session.user.id as string),
      matrixId,
      entity: 'FlowEntry',
      entityId: entryId,
      action: 'delete',
      changes: {
        deletedData: {
          rule_name: entry.rule_name,
          device: entry.device,
          src_name: entry.src_name,
          dst_name: entry.dst_name,
          comment: entry.comment
        },
        matrixName: entry.matrix.name
      }
    })

    logger.info('Matrix entry deleted successfully', {
      userId: parseInt(session.user.id as string),
      entryId,
      matrixId,
      matrixName: entry.matrix.name,
      deletedRuleName: entry.rule_name,
      deletedDevice: entry.device
    })

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      message: 'Matrix entry deleted successfully'
    })

  } catch (error) {
    logger.error('Error deleting matrix entry', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      matrixId,
      entryId,
      endpoint: '/api/matrices/[id]/entries/[entryId]',
      method: 'DELETE'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to delete matrix entry'
    }, { status: 500 })
  }
}