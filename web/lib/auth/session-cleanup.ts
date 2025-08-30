import { SessionManager } from './session-manager';
import { logger } from '@/lib/logger';

/**
 * Session cleanup utilities
 */
export class SessionCleanup {
  private static instance: SessionCleanup;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

  private constructor() {}

  static getInstance(): SessionCleanup {
    if (!SessionCleanup.instance) {
      SessionCleanup.instance = new SessionCleanup();
    }
    return SessionCleanup.instance;
  }

  /**
   * Start automatic session cleanup
   */
  start(): void {
    if (this.cleanupInterval) {
      return; // Already started
    }

    logger.info('Starting session cleanup service');
    
    // Run initial cleanup
    this.runCleanup();

    // Schedule recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Stop automatic session cleanup
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Session cleanup service stopped');
    }
  }

  /**
   * Run cleanup process
   */
  private async runCleanup(): Promise<void> {
    try {
      const startTime = Date.now();
      
      // Clean up all expired sessions
      const cleanedCount = await SessionManager.cleanupExpiredSessions();
      
      const duration = Date.now() - startTime;
      
      logger.info('Session cleanup completed', {
        cleanedSessions: cleanedCount,
        durationMs: duration
      });

    } catch (error) {
      logger.error('Session cleanup failed', error as Error);
    }
  }

  /**
   * Run immediate cleanup (for testing or manual execution)
   */
  async runImmediateCleanup(): Promise<number> {
    return await SessionManager.cleanupExpiredSessions();
  }
}

// Create global instance
const sessionCleanup = SessionCleanup.getInstance();

// Auto-start in production (but not during build time)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Only start if we're in a server environment
  if (process.env.NEXT_PHASE !== 'phase-production-build') {
    sessionCleanup.start();
  }
}

export default sessionCleanup;