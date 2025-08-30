import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { rateLimiters, RATE_LIMITS } from '@/lib/security/rateLimit'
import crypto from 'crypto'

export async function getCurrentUser() {
  const session = await auth()
  return session?.user || null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

export async function requireAdmin() {
  const user = await requireAuth()
  if (user.role !== 'admin') {
    throw new Error('Admin privileges required')
  }
  return user
}

// Enhanced session management with security features
export interface SessionInfo {
  id: string
  userId: number
  userAgent: string
  ipAddress: string
  createdAt: Date
  lastActiveAt: Date
  isActive: boolean
  expiresAt: Date
  deviceFingerprint?: string
  location?: string
}

export class SessionManager {
  private static readonly SESSION_DURATION = 12 * 60 * 60 * 1000 // 12 hours
  private static readonly MAX_SESSIONS_PER_USER = 5
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000 // 1 hour

  // Create a new session record
  static async createSession(
    userId: number, 
    userAgent: string, 
    ipAddress: string,
  ): Promise<SessionInfo> {
    // Check for existing active sessions and enforce limits
    const activeSessions = await prisma.userSession.findMany({
      where: { 
        userId, 
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActiveAt: 'desc' }
    })

    // If user has too many sessions, deactivate the oldest ones
    if (activeSessions.length >= this.MAX_SESSIONS_PER_USER) {
      const sessionsToDeactivate = activeSessions.slice(this.MAX_SESSIONS_PER_USER - 1)
      await prisma.userSession.updateMany({
        where: { 
          id: { in: sessionsToDeactivate.map(s => s.id) }
        },
        data: { isActive: false }
      })
    }

    // Create new session
    const expiresAt = new Date(Date.now() + this.SESSION_DURATION)
    const sessionToken = crypto.randomUUID()
    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        userAgent,
        ipAddress,
        // deviceFingerprint, // TODO: Add to schema if needed
        expiresAt,
        isActive: true,
        lastActiveAt: new Date()
      }
    })

    return {
      id: session.id,
      userId: session.userId,
      userAgent: session.userAgent || '',
      ipAddress: session.ipAddress || '',
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      // deviceFingerprint: session.deviceFingerprint || undefined // TODO: Add to schema
    }
  }

  // Update session activity
  static async updateActivity(sessionId: string): Promise<void> {
    await prisma.userSession.updateMany({
      where: { 
        id: sessionId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      data: { 
        lastActiveAt: new Date(),
        // Extend session if needed
        expiresAt: new Date(Date.now() + this.SESSION_DURATION)
      }
    })
  }

  // Get all active sessions for a user
  static async getUserSessions(userId: number): Promise<SessionInfo[]> {
    const sessions = await prisma.userSession.findMany({
      where: { 
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      orderBy: { lastActiveAt: 'desc' }
    })

    return sessions.map(session => ({
      id: session.id,
      userId: session.userId,
      userAgent: session.userAgent || '',
      ipAddress: session.ipAddress || '',
      createdAt: session.createdAt,
      lastActiveAt: session.lastActiveAt,
      isActive: session.isActive,
      expiresAt: session.expiresAt,
      // deviceFingerprint: session.deviceFingerprint || undefined // TODO: Add to schema
    }))
  }

  // Terminate a specific session
  static async terminateSession(sessionId: string, userId?: number): Promise<boolean> {
    const result = await prisma.userSession.updateMany({
      where: { 
        id: sessionId,
        ...(userId && { userId })
      },
      data: { isActive: false }
    })

    return result.count > 0
  }

  // Terminate all sessions for a user except current one
  static async terminateOtherSessions(userId: number, keepSessionId?: string): Promise<number> {
    const result = await prisma.userSession.updateMany({
      where: { 
        userId,
        isActive: true,
        ...(keepSessionId && { id: { not: keepSessionId } })
      },
      data: { isActive: false }
    })

    return result.count
  }

  // Clean up expired sessions
  static async cleanupExpiredSessions(): Promise<number> {
    const result = await prisma.userSession.updateMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { 
            isActive: true,
            lastActiveAt: { 
              lt: new Date(Date.now() - this.SESSION_DURATION * 2) 
            }
          }
        ]
      },
      data: { isActive: false }
    })

    return result.count
  }

  // Check if an IP has suspicious session activity
  static async checkSuspiciousActivity(
    ipAddress: string, 
    timeWindow: number = 60 * 60 * 1000
  ): Promise<boolean> {
    const recentSessions = await prisma.userSession.count({
      where: {
        ipAddress,
        createdAt: { gt: new Date(Date.now() - timeWindow) }
      }
    })

    // Flag as suspicious if more than 10 sessions from same IP in the time window
    return recentSessions > 10
  }

  // Get session analytics for admin
  static async getSessionAnalytics(days: number = 30): Promise<{
    totalActiveSessions: number
    uniqueUsers: number
    sessionsPerDay: Array<{ date: string; count: number }>
    topUserAgents: Array<{ userAgent: string; count: number }>
    topCountries: Array<{ country: string; count: number }>
  }> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    
    // Total active sessions
    const totalActiveSessions = await prisma.userSession.count({
      where: { 
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    })

    // Unique users
    const uniqueUsers = await prisma.userSession.findMany({
      where: { 
        isActive: true,
        expiresAt: { gt: new Date() }
      },
      select: { userId: true },
      distinct: ['userId']
    })

    // Sessions per day (simplified - would need proper date grouping in production)
    const recentSessions = await prisma.userSession.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true }
    })

    const sessionsPerDay = recentSessions.reduce((acc, session) => {
      const date = session.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Top user agents
    const userAgents = await prisma.userSession.groupBy({
      by: ['userAgent'],
      where: { createdAt: { gte: since } },
      _count: { userAgent: true },
      orderBy: { _count: { userAgent: 'desc' } },
      take: 10
    })

    return {
      totalActiveSessions,
      uniqueUsers: uniqueUsers.length,
      sessionsPerDay: Object.entries(sessionsPerDay).map(([date, count]) => ({ date, count })),
      topUserAgents: userAgents.map(ua => ({ 
        userAgent: ua.userAgent || '', 
        count: ua._count.userAgent 
      })),
      topCountries: [] // Would need IP geolocation service
    }
  }

  // Rate limit session creation per IP
  static async checkSessionCreationRateLimit(ipAddress: string): Promise<boolean> {
    const result = await rateLimiters.auth.checkLimit(`session_create:${ipAddress}`, {
      window: RATE_LIMITS.AUTH.window,
      max: 20, // Max 20 session creations per window
    })

    return result.allowed
  }
}

// Helper functions for request context
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0] ||
    headers.get('x-real-ip') ||
    headers.get('cf-connecting-ip') ||
    'unknown'
  )
}

export function getUserAgent(headers: Headers): string {
  return headers.get('user-agent') || 'unknown'
}

export function generateDeviceFingerprint(headers: Headers): string {
  const userAgent = headers.get('user-agent') || ''
  const acceptLanguage = headers.get('accept-language') || ''
  const acceptEncoding = headers.get('accept-encoding') || ''
  
  // Simple fingerprint based on headers
  const fingerprint = `${userAgent}|${acceptLanguage}|${acceptEncoding}`
  return Buffer.from(fingerprint).toString('base64').slice(0, 32)
}
