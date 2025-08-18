import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canEditMatrix } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { COLMAP } from '@/lib/csv'
import { parse } from 'csv-parse/sync'
import { logger } from '@/lib/logger'
import { MatrixImportSchema, CreateMatrixEntrySchema } from '@/lib/validate'
import { ApiResponse } from '@/types'

interface ImportResult {
  success: boolean
  imported: number
  errors: number
  total: number
  errorDetails?: Array<{
    row: number
    error: string
    data: any
  }>
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    logger.warn('Unauthorized attempt to import matrix data', {
      endpoint: '/api/matrices/[id]/import',
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
    logger.warn('Invalid matrix ID provided for import', {
      userId: session.user.id,
      providedId: resolvedParams.id,
      endpoint: '/api/matrices/[id]/import'
    })
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Invalid matrix ID'
    }, { status: 400 })
  }

  try {
    logger.info('Starting matrix data import', {
      userId: session.user.id,
      matrixId,
      endpoint: '/api/matrices/[id]/import',
      method: 'POST'
    })

    // Check matrix edit permissions
    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      logger.warn('User lacks permission to import matrix data', {
        userId: session.user.id,
        userRole: session.user.role,
        matrixId,
        action: 'import_data'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Insufficient permissions to import data into this matrix'
      }, { status: 403 })
    }

    // Verify matrix exists
    const matrix = await prisma.matrix.findUnique({
      where: { id: matrixId },
      select: { name: true, id: true }
    })

    if (!matrix) {
      logger.warn('Matrix not found for import', {
        userId: session.user.id,
        matrixId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Matrix not found'
      }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('csv') as File
    const overwriteParam = formData.get('overwrite') === 'true'
    const skipValidationParam = formData.get('skipValidation') === 'true'
    
    if (!file) {
      logger.warn('No file provided for matrix import', {
        userId: session.user.id,
        matrixId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'No file provided'
      }, { status: 400 })
    }

    // Validate file type and size
    if (!file.name.endsWith('.csv')) {
      logger.warn('Invalid file format for matrix import', {
        userId: session.user.id,
        matrixId,
        fileName: file.name,
        fileType: file.type
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Only CSV files are supported'
      }, { status: 400 })
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File too large for matrix import', {
        userId: session.user.id,
        matrixId,
        fileName: file.name,
        fileSize: file.size,
        maxSize: MAX_FILE_SIZE
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'File size exceeds 10MB limit'
      }, { status: 413 })
    }

    const csvText = await file.text()
    
    // Parse CSV with error handling
    let records: any[]
    try {
      records = parse(csvText, {
        columns: true,
        skip_empty_lines: true,
        delimiter: ',',
        quote: '"',
        cast: false,
        relax_column_count: true
      })
    } catch (parseError) {
      logger.warn('CSV parsing failed', {
        userId: session.user.id,
        matrixId,
        fileName: file.name,
        parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Invalid CSV format'
      }, { status: 400 })
    }

    if (records.length === 0) {
      logger.warn('Empty CSV file provided', {
        userId: session.user.id,
        matrixId,
        fileName: file.name
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'CSV file is empty'
      }, { status: 400 })
    }

    // Clear existing entries if overwrite is enabled
    if (overwriteParam) {
      const deletedCount = await prisma.flowEntry.count({
        where: { matrixId }
      })
      
      await prisma.flowEntry.deleteMany({
        where: { matrixId }
      })

      logger.info('Existing entries cleared for overwrite', {
        userId: session.user.id,
        matrixId,
        deletedCount
      })
    }

    let imported = 0
    let errors = 0
    const errorDetails: Array<{ row: number; error: string; data: any }> = []
    const duplicateRules: string[] = []

    // Process records with transaction for data integrity
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const rowNumber = i + 1

      try {
        // Map CSV columns to DB fields
        const entryData: any = {}
        
        for (const [csvCol, dbField] of Object.entries(COLMAP)) {
          if (record[csvCol]) {
            entryData[dbField] = record[csvCol].trim()
          }
        }

        // Convert date if present
        if (entryData.implementation_date) {
          try {
            entryData.implementation_date = new Date(entryData.implementation_date)
            if (isNaN(entryData.implementation_date.getTime())) {
              entryData.implementation_date = null
            }
          } catch {
            entryData.implementation_date = null
          }
        }

        // Validate data if not skipping validation
        if (!skipValidationParam) {
          try {
            CreateMatrixEntrySchema.parse(entryData)
          } catch (validationError) {
            throw new Error(`Validation failed: ${validationError instanceof Error ? validationError.message : 'Invalid data'}`)
          }
        }

        // Check for duplicate rule names
        if (entryData.rule_name) {
          if (duplicateRules.includes(entryData.rule_name)) {
            throw new Error(`Duplicate rule name in CSV: ${entryData.rule_name}`)
          }
          
          const existingEntry = await prisma.flowEntry.findFirst({
            where: {
              matrixId,
              rule_name: entryData.rule_name
            }
          })

          if (existingEntry && !overwriteParam) {
            throw new Error(`Rule name already exists: ${entryData.rule_name}`)
          }

          duplicateRules.push(entryData.rule_name)
        }

        // Create entry
        await prisma.flowEntry.create({
          data: {
            matrixId,
            ...entryData
          }
        })
        
        imported++

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        logger.warn('Error importing CSV row', {
          userId: session.user.id,
          matrixId,
          rowNumber,
          error: errorMessage,
          entryData: record
        })
        
        errors++
        errorDetails.push({
          row: rowNumber,
          error: errorMessage,
          data: record
        })
      }
    }

    // Comprehensive audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'Matrix',
      entityId: matrixId,
      action: 'update',
      changes: {
        import: {
          fileName: file.name,
          fileSize: file.size,
          totalRows: records.length,
          imported,
          errors,
          overwrite: overwriteParam,
          skipValidation: skipValidationParam,
          matrixName: matrix.name
        }
      }
    })

    const result: ImportResult = {
      success: errors < records.length,
      imported,
      errors,
      total: records.length,
      ...(errors > 0 && { errorDetails: errorDetails.slice(0, 10) }) // Limit error details to first 10
    }

    logger.info('Matrix data import completed', {
      userId: session.user.id,
      matrixId,
      matrixName: matrix.name,
      fileName: file.name,
      imported,
      errors,
      total: records.length,
      successRate: Math.round((imported / records.length) * 100)
    })

    return NextResponse.json<ApiResponse<ImportResult>>({
      success: true,
      data: result,
      message: `Import completed: ${imported} entries imported, ${errors} errors`
    })

  } catch (error) {
    logger.error('Error importing matrix data', error instanceof Error ? error : undefined, {
      userId: session.user.id,
      matrixId,
      endpoint: '/api/matrices/[id]/import',
      method: 'POST'
    })

    return NextResponse.json<ApiResponse<null>>({
      success: false,
      message: 'Failed to import matrix data'
    }, { status: 500 })
  }
}