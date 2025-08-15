import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Nom requis' },
        { status: 400 }
      )
    }

    const trimmedName = name.trim()

    if (trimmedName.length < 2) {
      return NextResponse.json(
        { error: 'Le nom doit contenir au moins 2 caractères' },
        { status: 400 }
      )
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Le nom ne peut pas dépasser 100 caractères' },
        { status: 400 }
      )
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { username: session.user.email }
        ]
      },
      select: { id: true, fullName: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier si le nom a changé
    if (user.fullName === trimmedName) {
      return NextResponse.json(
        { error: 'Le nouveau nom est identique à l\'ancien' },
        { status: 400 }
      )
    }

    // Mettre à jour le nom
    await prisma.user.update({
      where: { id: user.id },
      data: { fullName: trimmedName }
    })

    return NextResponse.json(
      { message: 'Nom modifié avec succès', name: trimmedName },
      { status: 200 }
    )

  } catch (error) {
    console.error('Erreur lors de la modification du nom:', error)
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}