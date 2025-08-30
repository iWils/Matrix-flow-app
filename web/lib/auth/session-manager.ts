import { prisma } from '@/lib/db';

export interface SessionInfo {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  isMobile?: boolean;
}

export class SessionManager {
  /**
   * Create a new user session
   */
  static async createSession(
    userId: number,
    sessionToken: string,
    ipAddress?: string,
    userAgent?: string,
    sessionTimeoutMinutes?: number
  ): Promise<string> {
    // Get user's session settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        sessionTimeoutMinutes: true, 
        maxConcurrentSessions: true 
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    const timeoutMinutes = sessionTimeoutMinutes || user.sessionTimeoutMinutes;
    const expiresAt = new Date(Date.now() + timeoutMinutes * 60 * 1000);

    // Parse device info
    const deviceInfo = this.parseUserAgent(userAgent);

    // Clean up expired sessions first
    await this.cleanupExpiredSessions(userId);

    // Check concurrent session limit
    const activeSessions = await prisma.userSession.count({
      where: {
        userId,
        isActive: true,
        expiresAt: { gt: new Date() }
      }
    });

    if (activeSessions >= user.maxConcurrentSessions) {
      // Remove oldest session to make room
      const oldestSession = await prisma.userSession.findFirst({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { lastActiveAt: 'asc' }
      });

      if (oldestSession) {
        await this.invalidateSession(oldestSession.id);
      }
    }

    // Create new session
    const session = await prisma.userSession.create({
      data: {
        userId,
        sessionToken,
        ipAddress,
        userAgent,
        deviceInfo: JSON.stringify(deviceInfo),
        expiresAt,
        isActive: true
      }
    });

    return session.id;
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(sessionToken: string): Promise<boolean> {
    try {
      const result = await prisma.userSession.updateMany({
        where: {
          sessionToken,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        data: {
          lastActiveAt: new Date()
        }
      });

      // Also update user's last active timestamp
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
        select: { userId: true }
      });

      if (session) {
        await prisma.user.update({
          where: { id: session.userId },
          data: { lastActiveAt: new Date() }
        });
      }

      return result.count > 0;
    } catch (error) {
      console.error('Failed to update session activity:', error);
      return false;
    }
  }

  /**
   * Validate session
   */
  static async validateSession(sessionToken: string): Promise<SessionInfo | null> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken }
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        if (session) {
          await this.invalidateSession(session.id);
        }
        return null;
      }

      // Update activity
      await this.updateSessionActivity(sessionToken);

      return {
        id: session.id,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        deviceInfo: session.deviceInfo || undefined,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
        isActive: session.isActive
      };
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }

  /**
   * Invalidate a specific session
   */
  static async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      await prisma.userSession.update({
        where: { id: sessionId },
        data: { isActive: false }
      });
      return true;
    } catch (error) {
      console.error('Failed to invalidate session:', error);
      return false;
    }
  }

  /**
   * Invalidate all user sessions except current
   */
  static async invalidateAllUserSessions(userId: number, exceptSessionId?: string): Promise<number> {
    try {
      const whereCondition: {
        userId: number;
        isActive: boolean;
        id?: { not: string };
      } = {
        userId,
        isActive: true
      };

      if (exceptSessionId) {
        whereCondition.id = { not: exceptSessionId };
      }

      const result = await prisma.userSession.updateMany({
        where: whereCondition,
        data: { isActive: false }
      });

      return result.count;
    } catch (error) {
      console.error('Failed to invalidate user sessions:', error);
      return 0;
    }
  }

  /**
   * Get user's active sessions
   */
  static async getUserSessions(userId: number): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.userSession.findMany({
        where: {
          userId,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        orderBy: { lastActiveAt: 'desc' }
      });

      return sessions.map(session => ({
        id: session.id,
        ipAddress: session.ipAddress || undefined,
        userAgent: session.userAgent || undefined,
        deviceInfo: session.deviceInfo || undefined,
        createdAt: session.createdAt,
        lastActiveAt: session.lastActiveAt,
        expiresAt: session.expiresAt,
        isActive: session.isActive
      }));
    } catch (error) {
      console.error('Failed to get user sessions:', error);
      return [];
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(userId?: number): Promise<number> {
    try {
      const whereCondition: {
        userId?: number;
        OR: Array<{ expiresAt: { lt: Date } } | { isActive: boolean }>;
      } = {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isActive: false }
        ]
      };

      if (userId) {
        whereCondition.userId = userId;
      }

      const result = await prisma.userSession.deleteMany({
        where: whereCondition
      });

      return result.count;
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * Parse user agent for device information
   */
  private static parseUserAgent(userAgent?: string): DeviceInfo {
    if (!userAgent) return {};

    const info: DeviceInfo = {};

    // Basic browser detection
    if (userAgent.includes('Chrome')) info.browser = 'Chrome';
    else if (userAgent.includes('Firefox')) info.browser = 'Firefox';
    else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) info.browser = 'Safari';
    else if (userAgent.includes('Edge')) info.browser = 'Edge';
    else if (userAgent.includes('Opera')) info.browser = 'Opera';

    // Basic OS detection
    if (userAgent.includes('Windows')) info.os = 'Windows';
    else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) info.os = 'macOS';
    else if (userAgent.includes('Linux')) info.os = 'Linux';
    else if (userAgent.includes('Android')) info.os = 'Android';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) info.os = 'iOS';

    // Mobile detection
    info.isMobile = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|Windows Phone/i.test(userAgent);

    return info;
  }

  /**
   * Extend session expiration
   */
  static async extendSession(sessionToken: string, additionalMinutes: number): Promise<boolean> {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken }
      });

      if (!session || !session.isActive) {
        return false;
      }

      const newExpiresAt = new Date(session.expiresAt.getTime() + additionalMinutes * 60 * 1000);

      await prisma.userSession.update({
        where: { sessionToken },
        data: { expiresAt: newExpiresAt }
      });

      return true;
    } catch (error) {
      console.error('Failed to extend session:', error);
      return false;
    }
  }
}

export default SessionManager;