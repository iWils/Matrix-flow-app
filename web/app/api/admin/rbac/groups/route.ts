import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userGroups = await prisma.userGroup.findMany({
      include: {
        _count: {
          select: { members: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const formattedGroups = userGroups.map(group => ({
      id: group.id,
      name: group.name,
      description: group.description,
      permissions: group.permissions,
      isActive: group.isActive,
      memberCount: group._count.members,
      createdAt: group.createdAt.toISOString()
    }))

    return NextResponse.json(formattedGroups)
  } catch (error) {
    console.error('Error fetching user groups:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, description, permissions } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Le nom du groupe est requis' },
        { status: 400 }
      )
    }

    // Vérifier si le nom existe déjà
    const existingGroup = await prisma.userGroup.findUnique({
      where: { name: name.trim() }
    })

    if (existingGroup) {
      return NextResponse.json(
        { error: 'Un groupe avec ce nom existe déjà' },
        { status: 400 }
      )
    }

    const userGroup = await prisma.userGroup.create({
      data: {
        name: name.trim(),
        description: description?.trim() || '',
        permissions: permissions || {},
        isActive: true
      }
    })

    return NextResponse.json({
      id: userGroup.id,
      name: userGroup.name,
      description: userGroup.description,
      permissions: userGroup.permissions,
      isActive: userGroup.isActive,
      memberCount: 0,
      createdAt: userGroup.createdAt.toISOString()
    })
  } catch (error) {
    console.error('Error creating user group:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}