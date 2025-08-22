import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { ChangeNameSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.email) {
    logger.warn('Unauthorized name change attempt', {
      endpoint: '/api/users/change-name',
      method: 'POST'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Non authentifié'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }

  try {
    const body = await request.json()
    
    logger.info('Name change attempt', {
      userId: parseInt(session.user.id as string),
      userEmail: session.user.email,
      endpoint: '/api/users/change-name'
    })
    
    // Validation avec Zod
    const validationResult = ChangeNameSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid name change data', {
        userId: parseInt(session.user.id as string),
        errors: validationResult.error.issues,
        body,
        endpoint: '/api/users/change-name'
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Données invalides',
        message: validationResult.error.issues[0]?.message
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { fullName } = validationResult.data

    logger.info('Retrieving user for name update', {
      userId: parseInt(session.user.id as string),
      userEmail: session.user.email,
      newName: fullName
    })

    // Récupérer l'utilisateur
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { username: session.user.email }
        ]
      },
      select: { id: true, username: true, email: true, fullName: true }
    })

    if (!user) {
      logger.error('User not found for name change', undefined, {
        sessionUserId: session.user.id,
        sessionUserEmail: session.user.email,
        endpoint: '/api/users/change-name'
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Utilisateur non trouvé'
      }
      
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Vérifier si le nom a changé
    if (user.fullName === fullName) {
      logger.warn('Attempted to set identical name', {
        userId: user.id,
        username: user.username,
        currentName: user.fullName,
        requestedName: fullName
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Le nouveau nom est identique à l\'ancien'
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const previousName = user.fullName

    logger.info('Updating user name', {
      userId: user.id,
      username: user.username,
      previousName,
      newName: fullName
    })

    // Mettre à jour le nom
    await prisma.user.update({
      where: { id: user.id },
      data: { fullName }
    })

    // Audit log
    await auditLog({
      userId: user.id,
      entity: 'User',
      entityId: user.id,
      action: 'update',
      changes: {
        action: 'name_change',
        previousName,
        newName: fullName,
        timestamp: new Date().toISOString()
      }
    })

    logger.info('Name changed successfully', {
      userId: user.id,
      username: user.username,
      previousName,
      newName: fullName,
      changeTimestamp: new Date().toISOString()
    })

    const response: ApiResponse<{ name: string }> = {
      success: true,
      data: { name: fullName },
      message: 'Nom modifié avec succès'
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error during name change', error as Error, {
      userId: parseInt(session.user.id as string),
      userEmail: session.user.email,
      endpoint: '/api/users/change-name'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}