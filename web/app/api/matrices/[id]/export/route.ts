import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canViewMatrix } from '@/lib/rbac'
import { logger } from '@/lib/logger'
import { auditLog } from '@/lib/audit'
import { MatrixExportSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to export matrix', {
      endpoint: '/api/matrices/[id]/export',
      method: 'GET',
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
    logger.warn('Invalid matrix ID provided for export', {
      userId: session.user.id,
      providedId: resolvedParams.id,
      endpoint: '/api/matrices/[id]/export'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Invalid matrix ID'
    }, { status: 400 })
  }

  try {
    logger.info('Starting matrix export', {
      userId: session.user.id,
      matrixId,
      endpoint: '/api/matrices/[id]/export',
      method: 'GET'
    })

    // Parse and validate query parameters
    const searchParams = req.nextUrl.searchParams
    const queryData = {
      format: searchParams.get('format') || 'csv',
      includeMetadata: searchParams.get('includeMetadata') === 'true'
    }

    const validatedQuery = MatrixExportSchema.parse(queryData)

    // Check matrix view permissions
    const canView = await canViewMatrix(session.user.id, session.user.role, matrixId)
    if (!canView) {
      logger.warn('User lacks permission to export matrix', {
        userId: session.user.id,
        userRole: session.user.role,
        matrixId,
        action: 'export_matrix'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Insufficient permissions to export this matrix'
      }, { status: 403 })
    }

    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      include: {
        entries: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!matrix) {
      logger.warn('Matrix not found for export', {
        userId: session.user.id,
        matrixId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Matrix not found'
      }, { status: 404 })
    }

    // Generate export based on format
    let response: NextResponse
    const exportTimestamp = new Date().toISOString().split('T')[0]
    const safeMatrixName = matrix.name.replace(/[^a-zA-Z0-9-_]/g, '_')

    switch (validatedQuery.format) {
      case 'csv':
        const headers = [
          'Nature de la demande',
          'Statut de la règle',
          'Nom de la règle',
          'Equipement Applicable (FW)',
          'Zone Source',
          'Nom de la Source',
          'IP ou Subnet de la Source',
          'Port Sources (Port + Protocole)',
          'Zone Destination',
          'Nom de la Destination',
          'IP ou Subnet de la Destination',
          'Groupe Protocole',
          'Port Destination (Port + Protocole)',
          'Action',
          'Date d\'implémentation',
          'Nom du demandeur',
          'Commentaire'
        ]

        if (validatedQuery.includeMetadata) {
          headers.push('Date de création', 'Dernière modification')
        }

        const csvRows = [headers]

        matrix.entries.forEach((entry: any) => {
          const row = [
            entry.request_type || '',
            entry.rule_status || '',
            entry.rule_name || '',
            entry.device || '',
            entry.src_zone || '',
            entry.src_name || '',
            entry.src_cidr || '',
            entry.src_service || '',
            entry.dst_zone || '',
            entry.dst_name || '',
            entry.dst_cidr || '',
            entry.protocol_group || '',
            entry.dst_service || '',
            entry.action || '',
            entry.implementation_date ? entry.implementation_date.toISOString().split('T')[0] : '',
            entry.requester || '',
            entry.comment || ''
          ]

          if (validatedQuery.includeMetadata) {
            row.push(
              entry.createdAt.toISOString().split('T')[0],
              entry.updatedAt.toISOString().split('T')[0]
            )
          }

          csvRows.push(row)
        })

        const csvContent = csvRows
          .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
          .join('\n')

        response = new NextResponse(csvContent)
        response.headers.set('Content-Type', 'text/csv; charset=utf-8')
        response.headers.set('Content-Disposition', `attachment; filename="matrix-${safeMatrixName}-${exportTimestamp}.csv"`)
        break

      case 'json':
        const jsonData = {
          matrix: {
            id: matrix.id,
            name: matrix.name,
            description: matrix.description,
            exportedAt: new Date().toISOString(),
            exportedBy: session.user.name || session.user.email
          },
          entries: matrix.entries.map((entry: any) => ({
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
            ...(validatedQuery.includeMetadata && {
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt
            })
          }))
        }

        response = NextResponse.json(jsonData)
        response.headers.set('Content-Disposition', `attachment; filename="matrix-${safeMatrixName}-${exportTimestamp}.json"`)
        break

      default:
        throw new Error(`Unsupported export format: ${validatedQuery.format}`)
    }

    // Audit log for matrix export
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'Matrix',
      entityId: matrixId,
      action: 'update',
      changes: {
        operation: 'export',
        format: validatedQuery.format,
        includeMetadata: validatedQuery.includeMetadata,
        entriesCount: matrix.entries.length,
        matrixName: matrix.name
      }
    })

    logger.info('Matrix exported successfully', {
      userId: session.user.id,
      matrixId,
      matrixName: matrix.name,
      format: validatedQuery.format,
      entriesCount: matrix.entries.length,
      includeMetadata: validatedQuery.includeMetadata,
      exportSize: validatedQuery.format === 'csv' ? 'csvContent.length' : 'JSON.stringify(jsonData).length'
    })

    return response

  } catch (error) {
    logger.error('Error exporting matrix', error instanceof Error ? error : undefined, {
      userId: session.user.id,
      matrixId,
      endpoint: '/api/matrices/[id]/export',
      method: 'GET'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to export matrix'
    }, { status: 500 })
  }
}
