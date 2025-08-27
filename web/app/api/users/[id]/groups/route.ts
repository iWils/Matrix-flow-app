import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

// GET /api/users/[id]/groups - Récupérer les groupes d'un utilisateur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const userGroups = await prisma.userGroupMember.findMany({
      where: { userId },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json(userGroups.map((ug) => ug.group))
  } catch (error) {
    console.error('Error fetching user groups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/users/[id]/groups - Assigner un utilisateur à un groupe
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const { groupId } = await request.json()
    if (!groupId) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 })
    }

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Vérifier que le groupe existe et est actif
    const group = await prisma.userGroup.findUnique({
      where: { id: groupId }
    })
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 })
    }
    if (!group.isActive) {
      return NextResponse.json({ error: 'Group is not active' }, { status: 400 })
    }

    // Créer l'association (ou ignorer si elle existe déjà)
    const membership = await prisma.userGroupMember.upsert({
      where: {
        userId_groupId: {
          userId,
          groupId
        }
      },
      update: {},
      create: {
        userId,
        groupId
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            description: true,
            permissions: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json(membership.group)
  } catch (error) {
    console.error('Error assigning user to group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id]/groups - Retirer un utilisateur d'un groupe
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const userId = parseInt(resolvedParams.id)
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const groupId = parseInt(searchParams.get('groupId') || '')
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Valid group ID is required' }, { status: 400 })
    }

    await prisma.userGroupMember.deleteMany({
      where: {
        userId,
        groupId
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing user from group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}