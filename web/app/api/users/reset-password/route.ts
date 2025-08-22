import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { AdminResetPasswordSchema } from '@/lib/validate'
import { ApiResponse } from '@/types'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    logger.warn('Unauthorized password reset attempt', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      endpoint: '/api/users/reset-password',
      method: 'POST'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized: Admin access required'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }
  
  try {
    const body = await request.json()
    
    logger.info('Admin password reset attempt', {
      adminId: session.user.id,
      adminRole: session.user.role,
      endpoint: '/api/users/reset-password'
    })
    
    // Validation avec Zod
    const validationResult = AdminResetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid admin password reset data', {
        adminId: session.user.id,
        errors: validationResult.error.issues,
        body: { ...body, newPassword: '[REDACTED]' }
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Données invalides',
        message: validationResult.error.issues[0]?.message
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { userId, newPassword } = validationResult.data

    logger.info('Checking target user for password reset', {
      adminId: session.user.id,
      targetUserId: userId
    })

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true, isActive: true }
    })

    if (!targetUser) {
      logger.warn('Password reset attempted on non-existent user', {
        adminId: session.user.id,
        targetUserId: userId
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Utilisateur introuvable'
      }
      
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Empêcher la réinitialisation du mot de passe d'un autre admin (sécurité)
    if (targetUser.role === 'admin' && targetUser.id !== parseInt(session.user.id as string)) {
      logger.warn('Admin attempted to reset another admin password', {
        adminId: session.user.id,
        targetUserId: userId,
        targetUsername: targetUser.username,
        targetRole: targetUser.role
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Impossible de réinitialiser le mot de passe d\'un autre administrateur'
      }
      
      return NextResponse.json(errorResponse, { status: 403 })
    }

    logger.info('Resetting user password', {
      adminId: session.user.id,
      targetUserId: userId,
      targetUsername: targetUser.username,
      targetRole: targetUser.role
    })
    
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        lastPasswordChange: new Date()
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastPasswordChange: true
      }
    })

    // Audit log critique pour la sécurité
    await auditLog({
      userId: parseInt(session.user.id as string),
      entity: 'User',
      entityId: userId,
      action: 'update',
      changes: {
        action: 'admin_password_reset',
        targetUser: targetUser.username,
        resetBy: session.user.email || session.user.name,
        timestamp: new Date().toISOString()
      }
    })

    logger.info('Password reset completed successfully', {
      adminId: session.user.id,
      targetUserId: userId,
      targetUsername: targetUser.username,
      resetTimestamp: new Date().toISOString()
    })

    const response: ApiResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
      message: `Mot de passe de "${targetUser.username}" réinitialisé avec succès`
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error during admin password reset', error as Error, {
      adminId: session.user.id,
      endpoint: '/api/users/reset-password'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}