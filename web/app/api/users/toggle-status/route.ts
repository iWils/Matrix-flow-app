import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { ToggleUserStatusSchema } from '@/lib/validate'
import { ApiResponse, User } from '@/types'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    logger.warn('Unauthorized user status toggle attempt', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      endpoint: '/api/users/toggle-status',
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
    
    logger.info('User status toggle attempt', {
      adminId: session.user.id,
      adminRole: session.user.role,
      endpoint: '/api/users/toggle-status'
    })
    
    // Validation avec Zod
    const validationResult = ToggleUserStatusSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid user status toggle data', {
        adminId: session.user.id,
        errors: validationResult.error.errors,
        body
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Données invalides',
        message: validationResult.error.errors[0]?.message
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { userId, isActive } = validationResult.data

    logger.info('Checking target user for status toggle', {
      adminId: session.user.id,
      targetUserId: userId,
      newStatus: isActive
    })

    // Vérifier que l'utilisateur cible existe
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, role: true, isActive: true }
    })

    if (!targetUser) {
      logger.warn('Status toggle attempted on non-existent user', {
        adminId: session.user.id,
        targetUserId: userId
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Utilisateur introuvable'
      }
      
      return NextResponse.json(errorResponse, { status: 404 })
    }

    // Empêcher la désactivation de son propre compte
    if (session.user.id === userId && !isActive) {
      logger.warn('Admin attempted to deactivate own account', {
        adminId: session.user.id,
        targetUserId: userId,
        targetUsername: targetUser.username
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Impossible de désactiver votre propre compte'
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    // Empêcher la désactivation d'un autre admin (sécurité renforcée)
    if (targetUser.role === 'admin' && targetUser.id !== session.user.id && !isActive) {
      logger.warn('Admin attempted to deactivate another admin', {
        adminId: session.user.id,
        targetUserId: userId,
        targetUsername: targetUser.username,
        targetRole: targetUser.role
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Impossible de désactiver un autre administrateur'
      }
      
      return NextResponse.json(errorResponse, { status: 403 })
    }

    // Vérifier si le statut a réellement changé
    if (targetUser.isActive === isActive) {
      logger.warn('Attempted to set identical user status', {
        adminId: session.user.id,
        targetUserId: userId,
        targetUsername: targetUser.username,
        currentStatus: targetUser.isActive,
        requestedStatus: isActive
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: `L'utilisateur est déjà ${isActive ? 'actif' : 'inactif'}`
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    logger.info('Updating user status', {
      adminId: session.user.id,
      targetUserId: userId,
      targetUsername: targetUser.username,
      previousStatus: targetUser.isActive,
      newStatus: isActive
    })
    
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
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

    // Audit log pour la sécurité
    await auditLog({
      userId: session.user.id,
      entity: 'User',
      entityId: userId,
      action: 'update',
      changes: {
        action: 'status_toggle',
        targetUser: targetUser.username,
        previousStatus: targetUser.isActive,
        newStatus: isActive,
        changedBy: session.user.email || session.user.name,
        timestamp: new Date().toISOString()
      }
    })

    logger.info('User status updated successfully', {
      adminId: session.user.id,
      targetUserId: userId,
      targetUsername: targetUser.username,
      previousStatus: targetUser.isActive,
      newStatus: isActive,
      updateTimestamp: new Date().toISOString()
    })

    const statusAction = isActive ? 'activé' : 'désactivé'
    const response: ApiResponse<typeof updatedUser> = {
      success: true,
      data: updatedUser,
      message: `Utilisateur "${targetUser.username}" ${statusAction} avec succès`
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error during user status toggle', error as Error, {
      adminId: session.user.id,
      endpoint: '/api/users/toggle-status'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}