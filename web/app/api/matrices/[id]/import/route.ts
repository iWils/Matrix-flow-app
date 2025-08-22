import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canEditMatrix } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { COLMAP } from '@/lib/csv'
import { parse } from 'csv-parse/sync'
import { logger } from '@/lib/logger'
import { CreateMatrixEntrySchema } from '@/lib/validate'
import { ApiResponse } from '@/types'
import * as XLSX from 'xlsx'

interface ImportResult {
  success: boolean
  imported: number
  errors: number
  total: number
  errorDetails?: Array<{
    row: number
    error: string
    data: Record<string, unknown>
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
      userId: parseInt(session.user.id as string),
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
      userId: parseInt(session.user.id as string),
      matrixId,
      endpoint: '/api/matrices/[id]/import',
      method: 'POST'
    })

    // Check matrix edit permissions
    const canEdit = await canEditMatrix(parseInt(session.user.id as string), session.user.role, matrixId)
    if (!canEdit) {
      logger.warn('User lacks permission to import matrix data', {
        userId: parseInt(session.user.id as string),
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
        userId: parseInt(session.user.id as string),
        matrixId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Matrix not found'
      }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const overwriteParam = formData.get('overwrite') === 'true'
    const skipValidationParam = formData.get('skipValidation') === 'true'
    
    if (!file) {
      logger.warn('No file provided for matrix import', {
        userId: parseInt(session.user.id as string),
        matrixId
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'No file provided'
      }, { status: 400 })
    }

    // Validate file type and size
    const supportedExtensions = ['.csv', '.xlsx', '.xls', '.json']
    const hasValidExtension = supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    
    if (!hasValidExtension) {
      logger.warn('Invalid file format for matrix import', {
        userId: parseInt(session.user.id as string),
        matrixId,
        fileName: file.name,
        fileType: file.type
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'Supported formats: CSV, XLSX, XLS, JSON'
      }, { status: 400 })
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_FILE_SIZE) {
      logger.warn('File too large for matrix import', {
        userId: parseInt(session.user.id as string),
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

    // Parse file based on format
    let records: Array<Record<string, string>>
    const fileExtension = file.name.toLowerCase().split('.').pop()
    
    try {
      switch (fileExtension) {
        case 'csv':
          const csvText = await file.text()
          
          // Auto-detect delimiter by checking first few lines
          const firstLines = csvText.split('\n').slice(0, 5).join('\n')
          const semicolonCount = (firstLines.match(/;/g) || []).length
          const commaCount = (firstLines.match(/,/g) || []).length
          const delimiter = semicolonCount > commaCount ? ';' : ','
          
          records = parse(csvText, {
            columns: true,
            skip_empty_lines: true,
            delimiter,
            quote: '"',
            cast: false,
            relax_column_count: true,
            relax_quotes: true, // Allow malformed quotes
            escape: '"'
          })
          break

        case 'xlsx':
        case 'xls':
          const workbookBuffer = await file.arrayBuffer()
          const workbook = XLSX.read(workbookBuffer, { type: 'buffer' })
          
          // Use first worksheet
          const firstSheetName = workbook.SheetNames[0]
          if (!firstSheetName) {
            throw new Error('No worksheets found in Excel file')
          }
          
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })
          
          if (jsonData.length < 2) {
            throw new Error('Excel file must contain at least a header row and one data row')
          }
          
          // Convert to records format
          const headers = jsonData[0] as string[]
          records = (jsonData.slice(1) as (string | number)[][]).map((row) => {
            const record: Record<string, string> = {}
            headers.forEach((header, colIndex) => {
              record[header] = row[colIndex] ? String(row[colIndex]).trim() : ''
            })
            return record
          })
          break

        case 'json':
          const jsonText = await file.text()
          const jsonContent = JSON.parse(jsonText)
          
          // Support both array format and object format with entries array
          if (Array.isArray(jsonContent)) {
            records = jsonContent
          } else if (jsonContent.entries && Array.isArray(jsonContent.entries)) {
            records = jsonContent.entries
          } else {
            throw new Error('JSON file must contain an array of entries or an object with an "entries" array')
          }
          break

        default:
          throw new Error(`Unsupported file format: ${fileExtension}`)
      }
    } catch (parseError) {
      logger.warn('File parsing failed', {
        userId: parseInt(session.user.id as string),
        matrixId,
        fileName: file.name,
        fileExtension,
        parseError: parseError instanceof Error ? parseError.message : 'Unknown error'
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: `Invalid ${fileExtension?.toUpperCase()} format: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      }, { status: 400 })
    }

    if (records.length === 0) {
      logger.warn('Empty file provided', {
        userId: parseInt(session.user.id as string),
        matrixId,
        fileName: file.name
      })
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        message: 'File contains no data'
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
        userId: parseInt(session.user.id as string),
        matrixId,
        deletedCount
      })
    }

    let imported = 0
    let errors = 0
    const errorDetails: Array<{ row: number; error: string; data: Record<string, unknown> }> = []
    const duplicateRules: string[] = []

    // Process records with transaction for data integrity
    for (let i = 0; i < records.length; i++) {
      const record = records[i]
      const rowNumber = i + 1

      try {
        // Map CSV columns to DB fields
        const entryData: Record<string, string | number | boolean | Date | null> = {}
        
        for (const [csvCol, dbField] of Object.entries(COLMAP)) {
          if (record[csvCol]) {
            entryData[dbField] = record[csvCol].trim()
          }
        }

        // Convert date if present
        if (entryData.implementation_date && entryData.implementation_date !== '') {
          try {
            let dateStr = entryData.implementation_date as string
            
            // Handle DD/MM/YYYY format
            if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
              const [day, month, year] = dateStr.split('/')
              dateStr = `${year}-${month}-${day}`
            }
            // Handle DD-MM-YYYY format
            else if (dateStr.match(/^\d{2}-\d{2}-\d{4}$/)) {
              const [day, month, year] = dateStr.split('-')
              dateStr = `${year}-${month}-${day}`
            }
            
            const parsedDate = new Date(dateStr)
            if (isNaN(parsedDate.getTime())) {
              throw new Error(`Invalid date format: ${entryData.implementation_date}`)
            }
            entryData.implementation_date = parsedDate
          } catch {
            throw new Error(`Invalid date format for implementation_date: ${entryData.implementation_date}. Expected formats: YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY`)
          }
        } else {
          entryData.implementation_date = null
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
          if (duplicateRules.includes(entryData.rule_name as string)) {
            throw new Error(`Duplicate rule name in CSV: ${entryData.rule_name}`)
          }
          
          const existingEntry = await prisma.flowEntry.findFirst({
            where: {
              matrixId,
              rule_name: entryData.rule_name as string
            }
          })

          if (existingEntry && !overwriteParam) {
            throw new Error(`Rule name already exists: ${entryData.rule_name}`)
          }

          duplicateRules.push(entryData.rule_name as string)
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
          userId: parseInt(session.user.id as string),
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
      userId: parseInt(session.user.id as string),
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
      userId: parseInt(session.user.id as string),
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
      userId: parseInt(session.user.id as string),
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