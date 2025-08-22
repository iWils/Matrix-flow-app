import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canEditMatrix } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { CreateMatrixVersionSchema } from '@/lib/validate'
import { ApiResponse, MatrixVersion, MatrixSnapshot, MatrixStatus } from '@/types'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to create matrix version', {
      endpoint: '/api/matrices/[id]/versions',
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
    logger.warn('Invalid matrix ID provided for version creation', {
      userId: parseInt(session.user.id as string),
      providedId: resolvedParams.id,
      endpoint: '/api/matrices/[id]/versions'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Invalid matrix ID'
    }, { status: 400 })
  }

  try {
    logger.info('Starting matrix version creation', {
      userId: parseInt(session.user.id as string),
      matrixId,
      endpoint: '/api/matrices/[id]/versions',
      method: 'POST'
    })

    // Check matrix edit permissions
    const canEdit = await canEditMatrix(parseInt(session.user.id as string), session.user.role, matrixId)
    if (!canEdit) {
      logger.warn('User lacks permission to create matrix version', {
        userId: parseInt(session.user.id as string),
        userRole: session.user.role,
        matrixId,
        action: 'create_version'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Insufficient permissions to create versions for this matrix'
      }, { status: 403 })
    }

    const body = await req.json()
    const validatedData = CreateMatrixVersionSchema.parse(body)

    // Get current matrix data with comprehensive information
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' }
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: { version: true, createdAt: true }
        }
      }
    })

    if (!matrix) {
      logger.warn('Matrix not found for version creation', {
        userId: parseInt(session.user.id as string),
        matrixId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Matrix not found'
      }, { status: 404 })
    }

    // Check if there are any changes since last version
    const hasRecentVersion = matrix.versions.length > 0
    if (hasRecentVersion && matrix.entries.length === 0) {
      logger.warn('Attempt to create version with no entries', {
        userId: parseInt(session.user.id as string),
        matrixId,
        matrixName: matrix.name
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Cannot create version: matrix has no entries'
      }, { status: 400 })
    }

    const nextVersion = (matrix.versions[0]?.version || 0) + 1

    // Create comprehensive snapshot
    const snapshot = {
      entries: matrix.entries.map((entry) => ({
        id: entry.id,
        request_type: entry.request_type,
        rule_status: entry.rule_status,
        rule_name: entry.rule_name,
        device: entry.device,
        src_zone: entry.src_zone,
        src_name: entry.src_name,
        src_cidr: entry.src_cidr,
        src_service: entry.src_service,
        dst_zone: entry.dst_zone,
        dst_name: entry.dst_name,
        dst_cidr: entry.dst_cidr,
        protocol_group: entry.protocol_group,
        dst_service: entry.dst_service,
        action: entry.action,
        implementation_date: entry.implementation_date,
        requester: entry.requester,
        comment: entry.comment,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      })),
      metadata: {
        name: matrix.name,
        description: matrix.description,
        entriesCount: matrix.entries.length,
        createdAt: new Date(),
        createdBy: {
          id: session.user.id,
          username: session.user.name || session.user.email,
          email: session.user.email
        }
      }
    }

    const version = await prisma.matrixVersion.create({
      data: {
        matrixId,
        version: nextVersion,
        note: validatedData.note?.trim() || null,
        snapshot,
        createdById: parseInt(session.user.id as string),
        requiredApprovals: matrix.requiredApprovals
      },
      include: {
        createdBy: {
          select: {
            username: true,
            fullName: true
          }
        }
      }
    })

    // Comprehensive audit log
    await auditLog({
      userId: parseInt(session.user.id as string),
      matrixId,
      entity: 'MatrixVersion',
      entityId: version.id,
      action: 'create',
      changes: {
        version: nextVersion,
        note: validatedData.note,
        entriesCount: matrix.entries.length,
        matrixName: matrix.name,
        previousVersion: matrix.versions[0]?.version || 0,
        snapshotSize: JSON.stringify(snapshot).length
      }
    })

    const formattedVersion: MatrixVersion = {
      id: version.id,
      matrixId: version.matrixId,
      version: version.version,
      note: version.note,
      snapshot: version.snapshot as unknown as MatrixSnapshot,
      status: version.status as MatrixStatus,
      createdById: version.createdById!,
      requiredApprovals: version.requiredApprovals!,
      createdAt: version.createdAt,
      updatedAt: version.createdAt, // Use createdAt as updatedAt for new versions
      createdBy: {
        username: version.createdBy?.username || '',
        fullName: version.createdBy?.fullName || ''
      }
    }

    logger.info('Matrix version created successfully', {
      userId: parseInt(session.user.id as string),
      versionId: version.id,
      matrixId,
      matrixName: matrix.name,
      version: nextVersion,
      entriesCount: matrix.entries.length,
      hasNote: !!validatedData.note
    })

    return NextResponse.json<ApiResponse<MatrixVersion>>({
      success: true,
      data: formattedVersion,
      message: `Version ${nextVersion} created successfully`
    }, { status: 201 })

  } catch (error) {
    logger.error('Error creating matrix version', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      matrixId,
      endpoint: '/api/matrices/[id]/versions',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create matrix version'
    }, { status: 500 })
  }
}