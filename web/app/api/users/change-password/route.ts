import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { ChangePasswordSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await auth()
  
  if (!session?.user?.email) {
    logger.warn('Unauthorized password change attempt', {
      endpoint: '/api/users/change-password',
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
    
    logger.info('Password change attempt', {
      userId: session.user.id,
      userEmail: session.user.email,
      endpoint: '/api/users/change-password'
    })
    
    // Validation avec Zod
    const validationResult = ChangePasswordSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid password change data', {
        userId: session.user.id,
        errors: validationResult.error.errors,
        endpoint: '/api/users/change-password'
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Données invalides',
        message: validationResult.error.errors[0]?.message
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { currentPassword, newPassword } = validationResult.data

    logger.info('Retrieving user for password verification', {
      userId: session.user.id,
      userEmail: session.user.email
    })

    // Récupérer l'utilisateur avec son mot de passe
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: session.user.email },
          { username: session.user.email }
        ]
      },
      select: { id: true, username: true, email: true, passwordHash: true }
    })

    if (!user) {
      logger.error('User not found for password change', undefined, {
        sessionUserId: session.user.id,
        sessionUserEmail: session.user.email,
        endpoint: '/api/users/change-password'
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Utilisateur non trouvé'
      }
      
      return NextResponse.json(errorResponse, { status: 404 })
    }

    logger.info('Verifying current password', {
      userId: user.id,
      username: user.username
    })

    // Vérifier le mot de passe actuel
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    
    if (!isCurrentPasswordValid) {
      logger.warn('Invalid current password provided', {
        userId: user.id,
        username: user.username,
        attempt: 'password_change',
        endpoint: '/api/users/change-password'
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Mot de passe actuel incorrect'
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    logger.info('Updating user password', {
      userId: user.id,
      username: user.username
    })

    // Hasher le nouveau mot de passe avec une meilleure sécurité
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Mettre à jour le mot de passe
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashedNewPassword,
        lastPasswordChange: new Date()
      }
    })

    // Audit log pour la sécurité
    await auditLog({
      userId: user.id,
      entity: 'User',
      entityId: user.id,
      action: 'update',
      changes: {
        action: 'password_change',
        timestamp: new Date().toISOString()
      }
    })

    logger.info('Password changed successfully', {
      userId: user.id,
      username: user.username,
      changeTimestamp: new Date().toISOString()
    })

    const response: ApiResponse = {
      success: true,
      message: 'Mot de passe changé avec succès'
    }

    return NextResponse.json(response)

  } catch (error) {
    logger.error('Error during password change', error as Error, {
      userId: session.user.id,
      userEmail: session.user.email,
      endpoint: '/api/users/change-password'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Erreur interne du serveur'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}