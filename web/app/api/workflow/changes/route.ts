import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { CreateChangeRequestSchema, GetChangeRequestsSchema } from '@/lib/validate'
import { ApiResponse, ChangeRequest } from '@/types'
import { emailService } from '@/lib/email-notifications'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to fetch change requests', {
      endpoint: '/api/workflow/changes',
      method: 'GET',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  try {
    logger.info('Starting change requests fetch', {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/workflow/changes',
      method: 'GET'
    })

    // Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams
    const queryData = {
      status: searchParams.get('status') || undefined,
      matrixId: searchParams.get('matrixId') || undefined,
      requestType: searchParams.get('requestType') || undefined
    }

    const validatedQuery = GetChangeRequestsSchema.parse(queryData)

    // Build filter conditions
    const whereCondition: Record<string, unknown> = {}
    if (validatedQuery.status) {
      whereCondition.status = validatedQuery.status
    }
    if (validatedQuery.matrixId) {
      whereCondition.matrixId = parseInt(validatedQuery.matrixId, 10)
    }
    if (validatedQuery.requestType) {
      whereCondition.requestType = validatedQuery.requestType
    }

    const changeRequests = await prisma.changeRequest.findMany({
      where: whereCondition,
      include: {
        matrix: {
          select: {
            name: true
          }
        },
        entry: {
          select: {
            rule_name: true
          }
        },
        requestedBy: {
          select: {
            username: true,
            fullName: true
          }
        },
        reviewedBy: {
          select: {
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        requestedAt: 'desc'
      }
    })

    // Format data for API response
    const formattedRequests: ChangeRequest[] = changeRequests.map((request) => ({
      id: request.id,
      matrixId: request.matrixId.toString(),
      matrixName: request.matrix.name,
      requestType: request.requestType as 'create_entry' | 'update_entry' | 'delete_entry',
      status: request.status as 'pending' | 'approved' | 'rejected',
      requestedBy: {
        username: request.requestedBy.username,
        fullName: request.requestedBy.fullName || undefined
      },
      requestedAt: request.requestedAt.toISOString(),
      reviewedBy: request.reviewedBy ? {
        username: request.reviewedBy.username,
        fullName: request.reviewedBy.fullName || undefined
      } : undefined,
      reviewedAt: request.reviewedAt?.toISOString(),
      description: request.description,
      changes: request.requestedData,
      reviewComment: request.reviewComment
    }))

    logger.info('Change requests fetched successfully', {
      userId: parseInt(session.user.id as string),
      count: formattedRequests.length,
      filters: validatedQuery,
      statusBreakdown: {
        pending: formattedRequests.filter(r => r.status === 'pending').length,
        approved: formattedRequests.filter(r => r.status === 'approved').length,
        rejected: formattedRequests.filter(r => r.status === 'rejected').length
      }
    })

    return NextResponse.json<ApiResponse<ChangeRequest[]>>({
      success: true,
      data: formattedRequests,
      message: `Found ${formattedRequests.length} change requests`
    })

  } catch (error) {
    logger.error('Error fetching change requests', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/workflow/changes',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to fetch change requests'
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to create change request', {
      endpoint: '/api/workflow/changes',
      method: 'POST',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  try {
    logger.info('Starting change request creation', {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/workflow/changes',
      method: 'POST'
    })

    const body = await req.json()
    const validatedData = CreateChangeRequestSchema.parse(body)
    
    // Convert string IDs to numbers
    const matrixId = parseInt(validatedData.matrixId, 10)
    const entryId = validatedData.entryId ? parseInt(validatedData.entryId, 10) : null

    // Verify matrix exists
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      select: { name: true, requiredApprovals: true }
    })

    if (!matrix) {
      logger.warn('Matrix not found for change request', {
        userId: parseInt(session.user.id as string),
        matrixId: matrixId,
        requestType: validatedData.requestType
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Matrix not found'
      }, { status: 404 })
    }

    // Verify entry exists for update/delete operations
    if ((validatedData.requestType === 'update_entry' || validatedData.requestType === 'delete_entry') && entryId) {
      const entry = await prisma.flowEntry.findUnique({
        where: { id: entryId, matrixId: matrixId }
      })

      if (!entry) {
        logger.warn('Entry not found for change request', {
          userId: parseInt(session.user.id as string),
          matrixId: matrixId,
          entryId: entryId,
          requestType: validatedData.requestType
        })
        return NextResponse.json<ApiResponse<null>>({
          success: false,
          message: 'Entry not found'
        }, { status: 404 })
      }
    }

    // Check for duplicate pending requests
    const existingRequest = await prisma.changeRequest.findFirst({
      where: {
        matrixId: matrixId,
        entryId: entryId,
        requestType: validatedData.requestType,
        status: 'pending',
        requestedById: parseInt(session.user.id as string)
      }
    })

    if (existingRequest) {
      logger.warn('Duplicate change request attempted', {
        userId: parseInt(session.user.id as string),
        matrixId: matrixId,
        existingRequestId: existingRequest.id,
        requestType: validatedData.requestType
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'A similar pending change request already exists'
      }, { status: 409 })
    }

    const changeRequest = await prisma.changeRequest.create({
      data: {
        matrixId: matrixId,
        entryId: entryId,
        requestType: validatedData.requestType,
        description: validatedData.description,
        requestedData: JSON.parse(JSON.stringify(validatedData.requestedData)),
        requestedById: parseInt(session.user.id as string)
      },
      include: {
        matrix: {
          select: {
            name: true
          }
        },
        requestedBy: {
          select: {
            username: true,
            fullName: true
          }
        }
      }
    })

    // Audit log for security tracking
    await auditLog({
      userId: parseInt(session.user.id as string),
      matrixId: matrixId,
      entity: 'ChangeRequest',
      entityId: changeRequest.id,
      action: 'create',
      changes: {
        requestType: validatedData.requestType,
        description: validatedData.description,
        entryId: entryId
      }
    })

    const formattedRequest: ChangeRequest = {
      id: changeRequest.id,
      matrixId: changeRequest.matrixId.toString(),
      matrixName: changeRequest.matrix.name,
      requestType: changeRequest.requestType as 'create_entry' | 'update_entry' | 'delete_entry',
      status: changeRequest.status as 'pending' | 'approved' | 'rejected',
      requestedBy: {
        username: changeRequest.requestedBy.username,
        fullName: changeRequest.requestedBy.fullName || undefined
      },
      requestedAt: changeRequest.requestedAt.toISOString(),
      description: changeRequest.description,
      changes: changeRequest.requestedData,
      reviewComment: null
    }

    // Envoyer notification de demande d'approbation aux admins
    try {
      const requesterName = session.user.name || 'Utilisateur'
      const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
      
      await emailService.sendChangeApprovalRequest({
        matrixName: matrix.name,
        requesterName,
        actionType: validatedData.requestType,
        changes: validatedData.description,
        changeRequestId: changeRequest.id,
        ipAddress
      })
    } catch (emailError) {
      // Log l'erreur mais ne pas faire échouer la création
      logger.warn('Failed to send approval request notification', {
        changeRequestId: changeRequest.id,
        error: emailError instanceof Error ? emailError.message : 'Unknown email error'
      })
    }

    logger.info('Change request created successfully', {
      userId: parseInt(session.user.id as string),
      changeRequestId: changeRequest.id,
      matrixId: matrixId,
      matrixName: matrix.name,
      requestType: validatedData.requestType,
      hasEntryId: !!entryId
    })

    return NextResponse.json<ApiResponse<ChangeRequest>>({
      success: true,
      data: formattedRequest,
      message: 'Change request created successfully'
    }, { status: 201 })

  } catch (error) {
    logger.error('Error creating change request', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      endpoint: '/api/workflow/changes',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to create change request'
    }, { status: 500 })
  }
}