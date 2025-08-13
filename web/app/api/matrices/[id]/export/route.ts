import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { canViewMatrix } from '@/lib/rbac'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const resolvedParams = await params
  const matrixId = parseInt(resolvedParams.id)
  if (isNaN(matrixId)) {
    return new NextResponse('Invalid matrix ID', { status: 400 })
  }

  try {
    const canView = await canViewMatrix(session.user.id, session.user.role, matrixId)
    if (!canView) {
      return new NextResponse('Forbidden', { status: 403 })
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
      return new NextResponse('Matrix not found', { status: 404 })
    }

    // Génération du CSV
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

    const csvRows = [headers]

    matrix.entries.forEach(entry => {
      csvRows.push([
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
      ])
    })

    const csvContent = csvRows
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const response = new NextResponse(csvContent)
    response.headers.set('Content-Type', 'text/csv; charset=utf-8')
    response.headers.set('Content-Disposition', `attachment; filename="matrix-${matrix.name}-${new Date().toISOString().split('T')[0]}.csv"`)

    return response
  } catch (error) {
    console.error('Error exporting matrix:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
