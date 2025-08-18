import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { canEditMatrix } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { CreateMatrixEntrySchema } from '@/lib/validate'
import { ApiResponse, MatrixEntry } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to create matrix entry', {
      endpoint: '/api/matrices/[id]/entries',
      method: 'POST',
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
  if (isNaN(matrixId)) {
    logger.warn('Invalid matrix ID provided for entry creation', {
      userId: session.user.id,
      providedId: resolvedParams.id,
      endpoint: '/api/matrices/[id]/entries'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Invalid matrix ID'
    }, { status: 400 })
  }

  try {
    logger.info('Starting matrix entry creation', {
      userId: session.user.id,
      matrixId,
      endpoint: '/api/matrices/[id]/entries',
      method: 'POST'
    })

    // Check matrix edit permissions
    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      logger.warn('User lacks permission to create matrix entry', {
        userId: session.user.id,
        userRole: session.user.role,
        matrixId,
        action: 'create_entry'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Insufficient permissions to create entries in this matrix'
      }, { status: 403 })
    }

    // Verify matrix exists
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      select: { name: true, id: true }
    })

    if (!matrix) {
      logger.warn('Matrix not found for entry creation', {
        userId: session.user.id,
        matrixId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Matrix not found'
      }, { status: 404 })
    }

    const body = await req.json()
    const validatedData = CreateMatrixEntrySchema.parse(body)

    // Check for duplicate rule names in the matrix
    if (validatedData.rule_name) {
      const existingEntry = await prisma.flowEntry.findFirst({
        where: {
          matrixId,
          rule_name: validatedData.rule_name
        }
      })

      if (existingEntry) {
        logger.warn('Duplicate rule name attempted', {
          userId: session.user.id,
          matrixId,
          ruleName: validatedData.rule_name,
          existingEntryId: existingEntry.id
        })
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'A rule with this name already exists in the matrix'
        }, { status: 409 })
      }
    }

    const entry = await prisma.flowEntry.create({
      data: {
        matrixId,
        ...validatedData,
        implementation_date: validatedData.implementation_date
          ? new Date(validatedData.implementation_date)
          : null
      }
    })

    // Comprehensive audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'FlowEntry',
      entityId: entry.id,
      action: 'create',
      changes: {
        ...validatedData,
        matrixName: matrix.name
      }
    })

    const formattedEntry: MatrixEntry = {
      id: entry.id,
      matrixId: entry.matrixId,
      row: entry.rule_name || '',
      column: entry.device || '',
      value: entry.comment || '',
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt
    }

    logger.info('Matrix entry created successfully', {
      userId: session.user.id,
      entryId: entry.id,
      matrixId,
      matrixName: matrix.name,
      ruleName: validatedData.rule_name,
      hasImplementationDate: !!validatedData.implementation_date
    })

    return NextResponse.json<ApiResponse<MatrixEntry>>({
      success: true,
      data: formattedEntry,
      message: 'Matrix entry created successfully'
    }, { status: 201 })

  } catch (error) {
    logger.error('Error creating matrix entry', error instanceof Error ? error : undefined, {
      userId: session.user.id,
      matrixId,
      endpoint: '/api/matrices/[id]/entries',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create matrix entry'
    }, { status: 500 })
  }
}