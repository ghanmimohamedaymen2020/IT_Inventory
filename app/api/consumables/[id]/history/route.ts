import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'

async function getDevSession() {
  const cookieStore = await cookies()
  const devSession = cookieStore.get('dev-session')
  
  if (!devSession) return null
  
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "secret")
    const { payload } = await jwtVerify(devSession.value, secret)
    return {
      user: {
        id: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
        companyId: payload.companyId as string,
      }
    }
  } catch (error) {
    return null
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { id } = await context.params

    const histories = await prisma.consumableHistory.findMany({
      where: { consumableId: id },
      orderBy: { createdAt: 'desc' },
      include: { user: true }
    })

    return NextResponse.json(histories)
  } catch (error) {
    console.error('GET /api/consumables/[id]/history error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
