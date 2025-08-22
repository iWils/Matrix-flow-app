import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const providers = await prisma.authProvider.findMany({
      orderBy: { priority: 'asc' }
    })

    return NextResponse.json(providers)
  } catch (error) {
    console.error('Error fetching auth providers:', error)
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

    const { name, type, config, isActive } = await request.json()

    if (!name?.trim() || !type || !config) {
      return NextResponse.json(
        { error: 'Nom, type et configuration sont requis' },
        { status: 400 }
      )
    }

    // Désactiver les autres fournisseurs du même type si celui-ci est activé
    if (isActive) {
      await prisma.authProvider.updateMany({
        where: { type },
        data: { isActive: false }
      })
    }

    const provider = await prisma.authProvider.upsert({
      where: { 
        name: name.trim()
      },
      update: {
        type,
        config,
        isActive: isActive || false,
        updatedAt: new Date()
      },
      create: {
        name: name.trim(),
        type,
        config,
        isActive: isActive || false,
        priority: 0
      }
    })

    return NextResponse.json(provider)
  } catch (error) {
    console.error('Error saving auth provider:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}