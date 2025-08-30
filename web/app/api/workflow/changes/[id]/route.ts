import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { ReviewChangeRequestSchema } from '@/lib/validate'
import { ApiResponse, ChangeRequest } from '@/types'
import { emailService } from '@/lib/email-notifications'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to review change request', {
      endpoint: '/api/workflow/changes/[id]',
      method: 'PATCH',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
      userAgent: req.headers.get('user-agent')
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Unauthorized'
    }, { status: 401 })
  }

  // Only admins can approve/reject change requests
  if (session.user.role !== 'admin') {
    logger.warn('Non-admin user attempted to review change request', {
      userId: parseInt(session.user.id as string),
      userRole: session.user.role,
      endpoint: '/api/workflow/changes/[id]',
      method: 'PATCH'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Forbidden: Only admins can review change requests'
    }, { status: 403 })
  }

  const resolvedParams = await params
  const requestId = parseInt(resolvedParams.id)
  if (isNaN(requestId)) {
    logger.warn('Invalid change request ID provided', {
      userId: parseInt(session.user.id as string),
      providedId: resolvedParams.id,
      endpoint: '/api/workflow/changes/[id]'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Invalid request ID'
    }, { status: 400 })
  }

  try {
    logger.info('Starting change request review', {
      userId: parseInt(session.user.id as string),
      changeRequestId: requestId,
      endpoint: '/api/workflow/changes/[id]',
      method: 'PATCH'
    })

    const body = await req.json()
    const validatedData = ReviewChangeRequestSchema.parse(body)

    // Fetch the change request with all necessary relations
    const changeRequest = await prisma.changeRequest.findUnique({
      where: { id: requestId },
      include: {
        matrix: {
          select: {
            id: true,
            name: true,
            requiredApprovals: true
          }
        },
        entry: {
          select: {
            id: true,
            rule_name: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            username: true,
            fullName: true
          }
        }
      }
    })

    if (!changeRequest) {
      logger.warn('Change request not found', {
        userId: parseInt(session.user.id as string),
        changeRequestId: requestId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Change request not found'
      }, { status: 404 })
    }

    if (changeRequest.status !== 'pending') {
      logger.warn('Attempt to review already processed change request', {
        userId: parseInt(session.user.id as string),
        changeRequestId: requestId,
        currentStatus: changeRequest.status,
        attemptedAction: validatedData.action
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: `Change request already ${changeRequest.status}`
      }, { status: 409 })
    }

    // Prevent users from approving their own requests
    if (changeRequest.requestedById === parseInt(session.user.id as string)) {
      logger.warn('User attempted to review their own change request', {
        userId: parseInt(session.user.id as string),
        changeRequestId: requestId,
        requestedById: changeRequest.requestedById
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Cannot review your own change request'
      }, { status: 403 })
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Update the change request
      const updatedRequest = await tx.changeRequest.update({
        where: { id: requestId },
        data: {
          status: validatedData.action === 'approve' ? 'approved' : 'rejected',
          reviewedById: parseInt(session.user.id as string),
          reviewedAt: new Date(),
          reviewComment: validatedData.reviewComment || null
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
          },
          reviewedBy: {
            select: {
              username: true,
              fullName: true
            }
          }
        }
      })

      // If approved, apply the changes
      if (validatedData.action === 'approve') {
        const requestedData = changeRequest.requestedData as Record<string, unknown>

        logger.info('Applying approved change request', {
          userId: parseInt(session.user.id as string),
          changeRequestId: requestId,
          requestType: changeRequest.requestType,
          matrixId: changeRequest.matrixId
        })

        switch (changeRequest.requestType) {
          case 'create_entry':
            // Create new entry
            const newEntry = await tx.flowEntry.create({
              data: {
                matrixId: changeRequest.matrixId,
                ...requestedData,
                implementation_date: requestedData.implementation_date
                  ? new Date(requestedData.implementation_date as string)
                  : null
              }
            })
            logger.info('New flow entry created from change request', {
              userId: parseInt(session.user.id as string),
              changeRequestId: requestId,
              newEntryId: newEntry.id,
              matrixId: changeRequest.matrixId
            })
            break

          case 'update_entry':
            // Update existing entry
            if (changeRequest.entryId) {
              await tx.flowEntry.update({
                where: { id: changeRequest.entryId },
                data: {
                  ...requestedData,
                  implementation_date: requestedData.implementation_date
                    ? new Date(requestedData.implementation_date as string)
                    : null,
                  updatedAt: new Date()
                }
              })
              logger.info('Flow entry updated from change request', {
                userId: parseInt(session.user.id as string),
                changeRequestId: requestId,
                entryId: changeRequest.entryId,
                matrixId: changeRequest.matrixId
              })
            }
            break

          case 'delete_entry':
            // Delete entry
            if (changeRequest.entryId) {
              await tx.flowEntry.delete({
                where: { id: changeRequest.entryId }
              })
              logger.info('Flow entry deleted from change request', {
                userId: parseInt(session.user.id as string),
                changeRequestId: requestId,
                deletedEntryId: changeRequest.entryId,
                matrixId: changeRequest.matrixId
              })
            }
            break
        }
      }

      return updatedRequest
    })

    // Comprehensive audit log for change request review
    await auditLog({
      userId: parseInt(session.user.id as string),
      matrixId: changeRequest.matrixId,
      entity: 'ChangeRequest',
      entityId: requestId,
      action: 'update',
      changes: {
        action: validatedData.action,
        reviewComment: validatedData.reviewComment,
        applied: validatedData.action === 'approve',
        requestType: changeRequest.requestType,
        requestedById: changeRequest.requestedById
      }
    })

    const formattedResponse: ChangeRequest = {
      id: result.id,
      matrixId: result.matrixId.toString(),
      matrixName: result.matrix.name,
      requestType: result.requestType as 'create_entry' | 'update_entry' | 'delete_entry',
      status: result.status as 'pending' | 'approved' | 'rejected',
      requestedBy: {
        username: result.requestedBy.username,
        fullName: result.requestedBy.fullName || undefined
      },
      requestedAt: result.requestedAt.toISOString(),
      reviewedBy: result.reviewedBy ? {
        username: result.reviewedBy.username,
        fullName: result.reviewedBy.fullName || undefined
      } : undefined,
      reviewedAt: result.reviewedAt?.toISOString(),
      description: result.description,
      changes: result.requestedData,
      reviewComment: result.reviewComment
    }

    // Envoyer notification email
    try {
      const requesterUser = await prisma.user.findUnique({
        where: { id: changeRequest.requestedById },
        select: { email: true }
      })

      if (requesterUser?.email) {
        const reviewerName = session.user.name || 'Admin'
        
        if (validatedData.action === 'approve') {
          await emailService.sendChangeNotification({
            matrixName: changeRequest.matrix.name,
            actionType: changeRequest.requestType,
            approverName: reviewerName,
            matrixId: changeRequest.matrixId,
            recipientEmail: requesterUser.email
          })
        } else {
          await emailService.sendChangeRejection({
            matrixName: changeRequest.matrix.name,
            actionType: changeRequest.requestType,
            approverName: reviewerName,
            reason: validatedData.reviewComment,
            matrixId: changeRequest.matrixId,
            recipientEmail: requesterUser.email
          })
        }
      }
    } catch (emailError) {
      // Log l'erreur mais ne pas faire échouer la requête
      logger.warn('Failed to send notification email', {
        changeRequestId: requestId,
        action: validatedData.action,
        error: emailError instanceof Error ? emailError.message : 'Unknown email error'
      })
    }

    logger.info('Change request reviewed successfully', {
      userId: parseInt(session.user.id as string),
      changeRequestId: requestId,
      action: validatedData.action,
      matrixId: changeRequest.matrixId,
      matrixName: changeRequest.matrix.name,
      requestType: changeRequest.requestType,
      requestedBy: changeRequest.requestedBy.username
    })

    return NextResponse.json<ApiResponse<ChangeRequest>>({
      success: true,
      data: formattedResponse,
      message: `Change request ${validatedData.action === 'approve' ? 'approved and applied' : 'rejected'} successfully`
    })

  } catch (error) {
    logger.error('Error reviewing change request', error instanceof Error ? error : undefined, {
      userId: parseInt(session.user.id as string),
      changeRequestId: requestId,
      endpoint: '/api/workflow/changes/[id]',
      method: 'PATCH'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to review change request'
    }, { status: 500 })
  }
}