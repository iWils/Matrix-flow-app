import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/auth'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  
  try {
    const [
      totalMatrices,
      totalEntries,
      totalUsers,
      recentActivity
    ] = await Promise.all([
      prisma.matrix.count(),
      prisma.flowEntry.count(),
      prisma.user.count(),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { at: 'desc' },
        include: {
          user: {
            select: { username: true, fullName: true }
          }
        }
      })
    ])

    return NextResponse.json({
      totalMatrices,
      totalEntries,
      totalUsers,
      recentActivity
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
