import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { auth } from '@/auth'
import { auditLog } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { RegisterUserSchema } from '@/lib/validate'
import { User, ApiResponse, RegisterResponse } from '@/types'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'admin') {
    logger.warn('Unauthorized user registration attempt', {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      endpoint: '/api/auth/register',
      method: 'POST'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Unauthorized: Admin access required for user registration'
    }
    
    return NextResponse.json(errorResponse, { status: 401 })
  }
  
  try {
    const body = await req.json()
    
    logger.info('User registration attempt', {
      adminId: session.user.id,
      requestedUsername: body.username,
      requestedRole: body.role,
      endpoint: '/api/auth/register'
    })
    
    // Validation avec Zod
    const validationResult = RegisterUserSchema.safeParse(body)
    if (!validationResult.success) {
      logger.warn('Invalid user registration data', {
        adminId: session.user.id,
        errors: validationResult.error.errors,
        body: { ...body, password: '[REDACTED]' }
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Données invalides',
        message: validationResult.error.errors[0]?.message
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }

    const { username, email, fullName, password, role } = validationResult.data

    logger.info('Checking for existing user', {
      adminId: session.user.id,
      username,
      email
    })

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          ...(email ? [{ email: email.trim() }] : [])
        ]
      },
      select: { id: true, username: true, email: true }
    })

    if (existingUser) {
      logger.warn('Attempted to create user with existing credentials', {
        adminId: session.user.id,
        requestedUsername: username,
        requestedEmail: email,
        existingUserId: existingUser.id,
        existingUsername: existingUser.username,
        existingEmail: existingUser.email
      })
      
      const errorResponse: ApiResponse = {
        success: false,
        error: 'Un utilisateur avec ce nom d\'utilisateur ou cette adresse email existe déjà'
      }
      
      return NextResponse.json(errorResponse, { status: 400 })
    }
    
    logger.info('Creating new user account', {
      adminId: session.user.id,
      username,
      email,
      role: role || 'viewer'
    })

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email?.trim() || null,
        fullName: fullName?.trim() || null,
        passwordHash: hashedPassword,
        role: role || 'viewer',
        isActive: true
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    // Audit log
    await auditLog({
      userId: session.user.id,
      entity: 'User',
      entityId: user.id,
      action: 'create',
      changes: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        isActive: user.isActive
      }
    })

    logger.info('User account created successfully', {
      adminId: session.user.id,
      newUserId: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    })
    
    const response: RegisterResponse = {
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email || '',
          name: user.fullName || user.username,
          role: user.role
        }
      },
      message: `Utilisateur "${user.username}" créé avec succès`
    }
    
    return NextResponse.json(response)
  } catch (error) {
    logger.error('Error creating user account', error as Error, {
      adminId: session.user.id,
      endpoint: '/api/auth/register'
    })
    
    const errorResponse: ApiResponse = {
      success: false,
      error: 'Internal Server Error'
    }
    
    return NextResponse.json(errorResponse, { status: 500 })
  }
}