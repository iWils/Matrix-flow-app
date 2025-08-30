import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { canViewMatrix } from '@/lib/rbac'
import { MatrixDiffEngine } from '@/lib/matrix-diff'
import { HistoryCache } from '@/lib/performance/history-cache'
import { DiffPaginator } from '@/lib/performance/diff-pagination'
import { z } from 'zod'

const DiffQuerySchema = z.object({
  fromVersion: z.string().transform(val => parseInt(val)),
  toVersion: z.string().transform(val => parseInt(val)),
  format: z.enum(['json', 'csv', 'markdown']).optional().default('json'),
  includeImpact: z.string().optional().transform(val => val === 'true'),
  // Nouveaux paramètres de pagination
  page: z.string().optional().transform(val => parseInt(val || '1')),
  pageSize: z.string().optional().transform(val => parseInt(val || '50')),
  sortBy: z.enum(['id', 'type', 'changes', 'impact']).optional().default('id'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
  filterTypes: z.string().optional(),
  search: z.string().optional(),
  impactLevel: z.enum(['low', 'medium', 'high']).optional(),
  useCache: z.string().optional().transform(val => val !== 'false')
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: matrixIdStr } = await params
    const matrixId = parseInt(matrixIdStr)

    if (isNaN(matrixId)) {
      return NextResponse.json({ error: 'Invalid matrix ID' }, { status: 400 })
    }

    // Check view permissions
    const canView = await canViewMatrix(parseInt(session.user.id), session.user.role, matrixId)
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const {
      fromVersion,
      toVersion,
      format,
      includeImpact,
      page,
      pageSize,
      sortBy,
      sortOrder,
      filterTypes,
      search,
      impactLevel,
      useCache
    } = DiffQuerySchema.parse({
      fromVersion: searchParams.get('fromVersion'),
      toVersion: searchParams.get('toVersion'),
      format: searchParams.get('format'),
      includeImpact: searchParams.get('includeImpact'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
      filterTypes: searchParams.get('filterTypes'),
      search: searchParams.get('search'),
      impactLevel: searchParams.get('impactLevel'),
      useCache: searchParams.get('useCache')
    })

    if (fromVersion === toVersion) {
      return NextResponse.json({ error: 'Cannot compare version with itself' }, { status: 400 })
    }

    // Get matrix versions
    const versions = await prisma.matrixVersion.findMany({
      where: {
        matrixId,
        version: {
          in: [fromVersion, toVersion]
        }
      },
      include: {
        createdBy: {
          select: {
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        version: 'asc'
      }
    })

    if (versions.length !== 2) {
      return NextResponse.json({ error: 'One or both versions not found' }, { status: 404 })
    }

    const [fromVer, toVer] = versions.sort((a, b) => a.version - b.version)

    // Try to get from cache first
    let diff: any = null
    let impact: any = undefined
    
    if (useCache) {
      const cached = await HistoryCache.getVersionDiff(matrixId, fromVersion, toVersion)
      if (cached) {
        diff = cached.diff
        impact = cached.impact
      }
    }

    // Generate diff if not in cache
    if (!diff) {
      diff = MatrixDiffEngine.generateDiff(
        fromVer.snapshot as any,
        toVer.snapshot as any,
        {
          fromVersion: fromVer.version,
          toVersion: toVer.version,
          fromDate: fromVer.createdAt,
          toDate: toVer.createdAt,
          fromCreatedBy: fromVer.createdBy?.fullName || fromVer.createdBy?.username || 'Unknown',
          toCreatedBy: toVer.createdBy?.fullName || toVer.createdBy?.username || 'Unknown'
        }
      )

      // Add impact analysis if requested
      if (includeImpact) {
        impact = MatrixDiffEngine.generateImpactAnalysis(diff)
      }

      // Cache the result for future requests
      if (useCache) {
        await HistoryCache.setVersionDiff(matrixId, fromVersion, toVersion, diff, impact)
      }
    }

    // Apply pagination and filters
    const filters: any = {}
    if (filterTypes) {
      filters.types = filterTypes.split(',')
    }
    if (search) {
      filters.search = search
    }
    if (impactLevel) {
      filters.impactLevel = impactLevel
    }

    const paginatedDiff = DiffPaginator.paginate(diff, {
      page,
      pageSize,
      sortBy,
      sortOrder,
      filters
    })

    // Get performance metrics
    const performanceMetrics = DiffPaginator.getPerformanceMetrics(diff)

    // Return in requested format
    if (format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          ...paginatedDiff,
          impact,
          performance: performanceMetrics,
          versions: {
            from: {
              version: fromVer.version,
              note: fromVer.note,
              createdAt: fromVer.createdAt,
              createdBy: fromVer.createdBy?.fullName || fromVer.createdBy?.username
            },
            to: {
              version: toVer.version,
              note: toVer.note,
              createdAt: toVer.createdAt,
              createdBy: toVer.createdBy?.fullName || toVer.createdBy?.username
            }
          },
          cached: useCache && !!impact // Indicate if result was cached
        }
      })
    } else {
      // Export as CSV or Markdown
      const exportData = MatrixDiffEngine.exportDiff(diff, format)
      const contentType = format === 'csv' ? 'text/csv' : 'text/markdown'
      const filename = `matrix-${matrixId}-diff-v${fromVersion}-to-v${toVersion}.${format}`

      return new NextResponse(exportData, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid query parameters', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error generating matrix diff:', error)
    return NextResponse.json(
      { error: 'Failed to generate diff' },
      { status: 500 }
    )
  }
}

// Also provide a POST endpoint for bulk diff operations
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: matrixIdStr } = await params
    const matrixId = parseInt(matrixIdStr)

    if (isNaN(matrixId)) {
      return NextResponse.json({ error: 'Invalid matrix ID' }, { status: 400 })
    }

    // Check view permissions
    const canView = await canViewMatrix(parseInt(session.user.id), session.user.role, matrixId)
    if (!canView) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { versions, includeImpact } = z.object({
      versions: z.array(z.number()).min(2),
      includeImpact: z.boolean().optional().default(false)
    }).parse(body)

    // Get all requested versions
    const matrixVersions = await prisma.matrixVersion.findMany({
      where: {
        matrixId,
        version: {
          in: versions
        }
      },
      include: {
        createdBy: {
          select: {
            username: true,
            fullName: true
          }
        }
      },
      orderBy: {
        version: 'asc'
      }
    })

    if (matrixVersions.length !== versions.length) {
      return NextResponse.json({ error: 'Some versions not found' }, { status: 404 })
    }

    // Generate timeline stats
    const snapshots = matrixVersions.map(v => ({
      version: v.version,
      snapshot: v.snapshot as any
    }))

    const stats = MatrixDiffEngine.generateVersionStats(snapshots)

    // Generate detailed diffs between consecutive versions if requested
    const diffs = []
    if (includeImpact) {
      for (let i = 1; i < matrixVersions.length; i++) {
        const fromVer = matrixVersions[i - 1]
        const toVer = matrixVersions[i]

        const diff = MatrixDiffEngine.generateDiff(
          fromVer.snapshot as any,
          toVer.snapshot as any,
          {
            fromVersion: fromVer.version,
            toVersion: toVer.version,
            fromDate: fromVer.createdAt,
            toDate: toVer.createdAt,
            fromCreatedBy: fromVer.createdBy?.fullName || fromVer.createdBy?.username || 'Unknown',
            toCreatedBy: toVer.createdBy?.fullName || toVer.createdBy?.username || 'Unknown'
          }
        )

        diffs.push({
          fromVersion: fromVer.version,
          toVersion: toVer.version,
          diff,
          impact: MatrixDiffEngine.generateImpactAnalysis(diff)
        })
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        stats,
        diffs: includeImpact ? diffs : undefined,
        versions: matrixVersions.map(v => ({
          version: v.version,
          note: v.note,
          createdAt: v.createdAt,
          createdBy: v.createdBy?.fullName || v.createdBy?.username
        }))
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error generating matrix diffs:', error)
    return NextResponse.json(
      { error: 'Failed to generate diffs' },
      { status: 500 }
    )
  }
}