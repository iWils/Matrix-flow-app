import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateLanguageSchema = z.object({
  language: z.enum(['fr', 'en', 'es'])
})

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { language } = updateLanguageSchema.parse(body)

    await prisma.user.update({
      where: { id: parseInt(session.user.id as string) },
      data: { language }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating user language:', error)
    return NextResponse.json(
      { error: 'Failed to update language' },
      { status: 500 }
    )
  }
}