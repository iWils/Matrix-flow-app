import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

// PUT /api/admin/rbac/groups/[id] - Modifier un groupe
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const groupId = parseInt(resolvedParams.id)
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 })
    }

    const { name, description, permissions, isActive } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Le nom du groupe est requis' },
        { status: 400 }
      )
    }

    // Vérifier si le nom existe déjà (sauf pour ce groupe)
    const existingGroup = await prisma.userGroup.findFirst({
      where: { 
        name: name.trim(),
        NOT: { id: groupId }
      }
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Un groupe avec ce nom existe déjà' },
        { status: 400 }
      )
    }

    const updatedGroup = await prisma.userGroup.update({
      where: { id: groupId },
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        permissions: permissions || {},
        isActive: isActive !== undefined ? isActive : true
      },
      include: {
        _count: {
          select: { members: true }
        }
      }
    })

    return NextResponse.json({
      id: updatedGroup.id,
      name: updatedGroup.name,
      description: updatedGroup.description,
      permissions: updatedGroup.permissions,
      isActive: updatedGroup.isActive,
      memberCount: updatedGroup._count.members,
      createdAt: updatedGroup.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error updating user group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/rbac/groups/[id] - Supprimer un groupe
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
    const groupId = parseInt(resolvedParams.id)
    if (isNaN(groupId)) {
      return NextResponse.json({ error: 'Invalid group ID' }, { status: 400 })
    }

    // Supprimer d'abord toutes les associations utilisateur-groupe
    await prisma.userGroupMember.deleteMany({
      where: { groupId }
    })

    // Puis supprimer le groupe
    await prisma.userGroup.delete({
      where: { id: groupId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting user group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}