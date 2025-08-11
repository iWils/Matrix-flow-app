import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canEditMatrix } from '@/lib/rbac'
import { auditLog } from '@/lib/audit'
import { COLMAP } from '@/lib/csv'
import { parse } from 'csv-parse/sync'

interface RouteParams {
  params: {
    id: string
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const matrixId = parseInt(params.id)
  if (isNaN(matrixId)) {
    return new NextResponse('Invalid matrix ID', { status: 400 })
  }

  try {
    const canEdit = await canEditMatrix(session.user.id, session.user.role, matrixId)
    if (!canEdit) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('csv') as File
    
    if (!file) {
      return new NextResponse('No file provided', { status: 400 })
    }

    const csvText = await file.text()
    
    // Parse CSV
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      delimiter: ',',
      quote: '"'
    })

    let imported = 0
    let errors = 0

    for (const record of records) {
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
          } catch {
            entryData.implementation_date = null
          }
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
        console.error('Error importing row:', error)
        errors++
      }
    }

    // Audit log
    await auditLog({
      userId: session.user.id,
      matrixId,
      entity: 'Matrix',
      entityId: matrixId,
      action: 'update',
      changes: { 
        import: { 
          total_rows: records.length, 
          imported, 
          errors,
          filename: file.name 
        }
      }
    })

    return NextResponse.json({
      success: true,
      imported,
      errors,
      total: records.length
    })
  } catch (error) {
    console.error('Error importing CSV:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}