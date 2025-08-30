import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const SubscriptionSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  }),
  deviceName: z.string().optional(),
  userAgent: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const body = await request.json()
    const { endpoint, keys, deviceName, userAgent } = SubscriptionSchema.parse(body)

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Check if subscription already exists
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: { endpoint }
    })

    let subscription
    if (existingSubscription) {
      // Update existing subscription
      subscription = await prisma.pushSubscription.update({
        where: { endpoint },
        data: {
          userId,
          p256dh: keys.p256dh,
          auth: keys.auth,
          deviceName,
          userAgent,
          ipAddress,
          isActive: true,
          lastUsed: new Date()
        }
      })
    } else {
      // Create new subscription
      subscription = await prisma.pushSubscription.create({
        data: {
          userId,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          deviceName,
          userAgent,
          ipAddress,
          isActive: true
        }
      })
    }

    // Log the subscription in audit trail
    await prisma.auditLog.create({
      data: {
        userId,
        entity: 'push_subscription',
        entityId: subscription.id,
        action: existingSubscription ? 'update' : 'create',
        changes: {
          action: existingSubscription ? 'subscription_updated' : 'subscription_created',
          endpoint: endpoint.substring(0, 50) + '...', // Truncate for security
          deviceName,
          ipAddress
        },
        ip: ipAddress
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        id: subscription.id,
        deviceName: subscription.deviceName,
        createdAt: subscription.createdAt,
        isActive: subscription.isActive
      },
      message: existingSubscription ? 'Subscription updated' : 'Subscription created'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid subscription data', 
          details: error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    console.error('Error subscribing to push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to subscribe to push notifications' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)

    // Get all active subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true
      },
      select: {
        id: true,
        deviceName: true,
        userAgent: true,
        ipAddress: true,
        createdAt: true,
        lastUsed: true
      },
      orderBy: {
        lastUsed: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      data: subscriptions
    })

  } catch (error) {
    console.error('Error fetching push subscriptions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch push subscriptions' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = parseInt(session.user.id)
    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get('endpoint')
    const subscriptionId = searchParams.get('id')

    if (!endpoint && !subscriptionId) {
      return NextResponse.json(
        { error: 'Endpoint or subscription ID is required' },
        { status: 400 }
      )
    }

    let whereClause: any = { userId }
    
    if (subscriptionId) {
      whereClause.id = parseInt(subscriptionId)
    } else if (endpoint) {
      whereClause.endpoint = endpoint
    }

    // Find the subscription first
    const subscription = await prisma.pushSubscription.findFirst({
      where: whereClause
    })

    if (!subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      )
    }

    // Deactivate the subscription (soft delete)
    await prisma.pushSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false }
    })

    // Log the unsubscription
    await prisma.auditLog.create({
      data: {
        userId,
        entity: 'push_subscription',
        entityId: subscription.id,
        action: 'update',
        changes: {
          action: 'subscription_deactivated',
          endpoint: subscription.endpoint.substring(0, 50) + '...',
          deviceName: subscription.deviceName
        },
        ip: request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications'
    })

  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    )
  }
}