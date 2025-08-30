import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await request.json();
    const userId = parseInt(session.user.id as string);
    const headersList = await headers();
    const forwarded = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0] || realIp || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Parse user agent for device info
    const deviceInfo = parseUserAgent(userAgent);

    if (action === 'create') {
      // Vérifier si une session existe déjà
      const existingSession = await prisma.userSession.findFirst({
        where: {
          userId,
          ipAddress,
          isActive: true,
          expiresAt: { gt: new Date() }
        }
      });

      if (existingSession) {
        // Mettre à jour la session existante
        await prisma.userSession.update({
          where: { id: existingSession.id },
          data: {
            lastActiveAt: new Date(),
            userAgent,
            deviceInfo: JSON.stringify(deviceInfo)
          }
        });
      } else {
        // Créer une nouvelle session
        await prisma.userSession.create({
          data: {
            userId,
            sessionToken: generateSessionToken(),
            ipAddress,
            userAgent,
            deviceInfo: JSON.stringify(deviceInfo),
            isActive: true,
            createdAt: new Date(),
            lastActiveAt: new Date(),
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 heures
          }
        });
      }

      // Nettoyer les sessions expirées de cet utilisateur
      await prisma.userSession.deleteMany({
        where: {
          userId,
          OR: [
            { isActive: false },
            { expiresAt: { lt: new Date() } }
          ]
        }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'update') {
      // Mettre à jour l'activité de la session
      await prisma.userSession.updateMany({
        where: {
          userId,
          ipAddress,
          isActive: true,
          expiresAt: { gt: new Date() }
        },
        data: {
          lastActiveAt: new Date()
        }
      });

      return NextResponse.json({ success: true });
    }

    if (action === 'cleanup') {
      // Marquer les sessions de cet utilisateur comme inactives
      await prisma.userSession.updateMany({
        where: {
          userId,
          isActive: true
        },
        data: {
          isActive: false
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Session hook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateSessionToken(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
}

function parseUserAgent(userAgent: string) {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';

  return {
    browser,
    os,
    isMobile,
    userAgent: userAgent.substring(0, 200) // Limiter la taille
  };
}