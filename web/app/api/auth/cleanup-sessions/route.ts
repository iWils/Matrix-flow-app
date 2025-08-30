import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import sessionCleanup from '@/lib/auth/session-cleanup';

/**
 * API route to manually trigger session cleanup
 * Only accessible by admin users
 */
export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only allow admin users to trigger cleanup
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Run immediate cleanup
    const cleanedCount = await sessionCleanup.runImmediateCleanup();

    return NextResponse.json({
      success: true,
      cleanedSessions: cleanedCount,
      message: `Cleaned up ${cleanedCount} expired session(s)`
    });

  } catch (error) {
    console.error('Manual session cleanup failed:', error);
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get cleanup status and statistics
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Only allow admin users to view cleanup stats
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get current session statistics
    const { prisma } = await import('@/lib/db');
    
    const [totalSessions, activeSessions, expiredSessions] = await Promise.all([
      prisma.userSession.count(),
      prisma.userSession.count({
        where: {
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      }),
      prisma.userSession.count({
        where: {
          OR: [
            { isActive: false },
            { expiresAt: { lte: new Date() } }
          ]
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      stats: {
        totalSessions,
        activeSessions,
        expiredSessions,
        cleanupIntervalMinutes: 60, // 1 hour
        lastCleanup: new Date().toISOString() // Placeholder - in real app, store this
      }
    });

  } catch (error) {
    console.error('Failed to get cleanup stats:', error);
    return NextResponse.json({
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}