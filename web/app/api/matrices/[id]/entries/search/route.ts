import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { checkMatrixPermission } from '@/lib/rbac'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = await params
    const matrixId = parseInt(resolvedParams.id)
    if (isNaN(matrixId)) {
      return NextResponse.json({ error: 'ID matrice invalide' }, { status: 400 })
    }

    // Vérifier les permissions
    const canView = await checkMatrixPermission(parseInt(session.user.id), matrixId, 'view')
    if (!canView) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    
    // Récupérer les paramètres de recherche
    const filters = {
      query: searchParams.get('query') || undefined,
      rule_name: searchParams.get('rule_name') || undefined,
      src_zone: searchParams.get('src_zone') || undefined,
      src_cidr: searchParams.get('src_cidr') || undefined,
      dst_zone: searchParams.get('dst_zone') || undefined,
      dst_cidr: searchParams.get('dst_cidr') || undefined,
      dst_service: searchParams.get('dst_service') || undefined,
      protocol_group: searchParams.get('protocol_group') || undefined,
      action: searchParams.get('action') || undefined,
      rule_status: searchParams.get('rule_status') || undefined,
      requester: searchParams.get('requester') || undefined,
      device: searchParams.get('device') || undefined,
      comment: searchParams.get('comment') || undefined,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined
    }

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Construire la clause WHERE
    const whereClause: Record<string, unknown> = {
      matrixId: matrixId
    }

    // Recherche globale full-text
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase()
      whereClause.OR = [
        { rule_name: { contains: searchTerm, mode: 'insensitive' } },
        { src_zone: { contains: searchTerm, mode: 'insensitive' } },
        { src_cidr: { contains: searchTerm, mode: 'insensitive' } },
        { dst_zone: { contains: searchTerm, mode: 'insensitive' } },
        { dst_cidr: { contains: searchTerm, mode: 'insensitive' } },
        { dst_service: { contains: searchTerm, mode: 'insensitive' } },
        { protocol_group: { contains: searchTerm, mode: 'insensitive' } },
        { action: { contains: searchTerm, mode: 'insensitive' } },
        { rule_status: { contains: searchTerm, mode: 'insensitive' } },
        { requester: { contains: searchTerm, mode: 'insensitive' } },
        { device: { contains: searchTerm, mode: 'insensitive' } },
        { comment: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Filtres spécifiques
    const fieldFilters = [
      'rule_name', 'src_zone', 'src_cidr', 'dst_zone', 'dst_cidr', 
      'dst_service', 'protocol_group', 'action', 'rule_status', 
      'requester', 'device', 'comment'
    ]

    fieldFilters.forEach(field => {
      if (filters[field as keyof typeof filters]) {
        whereClause[field] = {
          contains: filters[field as keyof typeof filters],
          mode: 'insensitive'
        }
      }
    })

    // Filtres de dates (fonctionnalité simplifiée pour éviter les conflits TypeScript)
    if (filters.dateFrom) {
      (whereClause as {createdAt?: {gte?: Date}}).createdAt = { gte: new Date(filters.dateFrom) }
    }
    if (filters.dateTo) {
      const existingDate = (whereClause as {createdAt?: {gte?: Date}}).createdAt || {}
      ;(whereClause as {createdAt?: {gte?: Date, lte?: Date}}).createdAt = { 
        ...existingDate, 
        lte: new Date(filters.dateTo + 'T23:59:59.999Z') 
      }
    }

    // Exécuter la recherche avec comptage
    const [entries, totalCount] = await Promise.all([
      prisma.flowEntry.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          matrix: {
            select: { name: true }
          }
        }
      }),
      prisma.flowEntry.count({
        where: whereClause
      })
    ])

    // Calculer les métadonnées de pagination
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1

    // Statistiques de recherche
    const stats = {
      totalResults: totalCount,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPreviousPage
    }

    // Compter par action pour stats
    const actionStats = await prisma.flowEntry.groupBy({
      by: ['action'],
      where: whereClause,
      _count: {
        _all: true
      }
    })

    // Compter par statut pour stats
    const statusStats = await prisma.flowEntry.groupBy({
      by: ['rule_status'],
      where: whereClause,
      _count: {
        _all: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        entries,
        stats,
        actionStats: actionStats.map(stat => ({
          action: stat.action,
          count: stat._count._all
        })),
        statusStats: statusStats.map(stat => ({
          status: stat.rule_status,
          count: stat._count._all
        })),
        appliedFilters: Object.fromEntries(
          Object.entries(filters).filter(([, value]) => value !== undefined)
        )
      }
    })

  } catch (error) {
    console.error('Advanced search error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche' },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = await params
    const matrixId = parseInt(resolvedParams.id)
    if (isNaN(matrixId)) {
      return NextResponse.json({ error: 'ID matrice invalide' }, { status: 400 })
    }

    // Vérifier les permissions
    const canView = await checkMatrixPermission(parseInt(session.user.id), matrixId, 'view')
    if (!canView) {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const body = await req.json()
    const { filters, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = body

    if (!filters || typeof filters !== 'object') {
      return NextResponse.json({ error: 'Filtres invalides' }, { status: 400 })
    }

    const offset = (page - 1) * limit

    // Construire la clause WHERE avec les filtres avancés du body
    const whereClause: Record<string, unknown> = {
      matrixId: matrixId
    }

    // Recherche globale
    if (filters.query) {
      const searchTerm = filters.query.toLowerCase()
      whereClause.OR = [
        { rule_name: { contains: searchTerm, mode: 'insensitive' } },
        { src_zone: { contains: searchTerm, mode: 'insensitive' } },
        { src_cidr: { contains: searchTerm, mode: 'insensitive' } },
        { dst_zone: { contains: searchTerm, mode: 'insensitive' } },
        { dst_cidr: { contains: searchTerm, mode: 'insensitive' } },
        { dst_service: { contains: searchTerm, mode: 'insensitive' } },
        { protocol_group: { contains: searchTerm, mode: 'insensitive' } },
        { action: { contains: searchTerm, mode: 'insensitive' } },
        { rule_status: { contains: searchTerm, mode: 'insensitive' } },
        { requester: { contains: searchTerm, mode: 'insensitive' } },
        { device: { contains: searchTerm, mode: 'insensitive' } },
        { comment: { contains: searchTerm, mode: 'insensitive' } }
      ]
    }

    // Appliquer tous les autres filtres
    Object.keys(filters).forEach(key => {
      if (key !== 'query' && key !== 'dateFrom' && key !== 'dateTo' && filters[key]) {
        if (key === 'action' || key === 'rule_status') {
          // Correspondance exacte pour les énums
          whereClause[key] = filters[key]
        } else {
          // Correspondance partielle pour les autres champs
          whereClause[key] = {
            contains: filters[key],
            mode: 'insensitive'
          }
        }
      }
    })

    // Filtres de dates (version POST - simplifiée)
    if (filters.dateFrom) {
      (whereClause as {createdAt?: {gte?: Date}}).createdAt = { gte: new Date(filters.dateFrom) }
    }
    if (filters.dateTo) {
      const existingDate = (whereClause as {createdAt?: {gte?: Date}}).createdAt || {}
      ;(whereClause as {createdAt?: {gte?: Date, lte?: Date}}).createdAt = { 
        ...existingDate, 
        lte: new Date(filters.dateTo + 'T23:59:59.999Z') 
      }
    }

    // Construire le tri
    const orderBy: Record<string, unknown> = {}
    orderBy[sortBy] = sortOrder

    // Exécuter la recherche
    const [entries, totalCount] = await Promise.all([
      prisma.flowEntry.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy,
        include: {
          matrix: {
            select: { name: true }
          }
        }
      }),
      prisma.flowEntry.count({
        where: whereClause
      })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: {
        entries,
        pagination: {
          totalResults: totalCount,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        appliedFilters: filters,
        sorting: {
          sortBy,
          sortOrder
        }
      }
    })

  } catch (error) {
    console.error('Advanced search POST error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la recherche avancée' },
      { status: 500 }
    )
  }
}