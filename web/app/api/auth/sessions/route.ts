import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { SessionManager, SessionInfo } from '@/lib/auth/session-manager';
import { z } from 'zod';

const InvalidateSchema = z.object({
  sessionId: z.string().optional(),
  action: z.enum(['invalidate', 'invalidate-all', 'invalidate-others'])
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Get user's active sessions
    const sessions = await SessionManager.getUserSessions(userId);

    // Format sessions for display
    const formattedSessions = sessions.map((sessionInfo: SessionInfo) => {
      const deviceInfo = sessionInfo.deviceInfo 
        ? JSON.parse(sessionInfo.deviceInfo) 
        : {};

      return {
        id: sessionInfo.id,
        ipAddress: sessionInfo.ipAddress,
        browser: deviceInfo.browser || 'Unknown',
        os: deviceInfo.os || 'Unknown',
        isMobile: deviceInfo.isMobile || false,
        createdAt: sessionInfo.createdAt,
        lastActiveAt: sessionInfo.lastActiveAt,
        expiresAt: sessionInfo.expiresAt,
        isActive: sessionInfo.isActive
      };
    });

    return NextResponse.json({
      sessions: formattedSessions,
      total: formattedSessions.length
    });

  } catch (error) {
    console.error('Sessions list error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { sessionId, action } = InvalidateSchema.parse(body);

    let invalidatedCount = 0;

    switch (action) {
      case 'invalidate':
        if (!sessionId) {
          return NextResponse.json({ 
            error: 'Session ID required' 
          }, { status: 400 });
        }
        
        const success = await SessionManager.invalidateSession(sessionId);
        invalidatedCount = success ? 1 : 0;
        break;

      case 'invalidate-all':
        invalidatedCount = await SessionManager.invalidateAllUserSessions(userId);
        break;

      case 'invalidate-others':
        // Get current session ID from request headers or token
        // For now, we'll invalidate all sessions
        // In a real implementation, you'd pass the current session ID
        invalidatedCount = await SessionManager.invalidateAllUserSessions(userId);
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      invalidatedCount,
      message: `${invalidatedCount} session(s) invalidated`
    });

  } catch (error) {
    console.error('Session invalidation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionToken, extendMinutes } = z.object({
      sessionToken: z.string(),
      extendMinutes: z.number().min(1).max(1440) // Max 24 hours
    }).parse(body);

    const success = await SessionManager.extendSession(sessionToken, extendMinutes);

    if (!success) {
      return NextResponse.json({ 
        error: 'Failed to extend session' 
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Session extended by ${extendMinutes} minutes`
    });

  } catch (error) {
    console.error('Session extension error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.issues 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}