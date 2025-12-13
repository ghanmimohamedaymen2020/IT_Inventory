import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

async function getDevSession() {
  const cookieStore = await cookies()
  const devSession = cookieStore.get('dev-session')
  if (!devSession) return null
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'secret')
    const { payload } = await jwtVerify(devSession.value, secret)
    return { user: { id: payload.sub as string, role: payload.role as string, companyId: payload.companyId as string } }
  } catch (err) {
    return null
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // return distinct consumable names across all companies
    const rows = await prisma.consumable.findMany({ distinct: ['name'], select: { name: true }, orderBy: { name: 'asc' } })
    const names = rows.map(r => r.name)
    return NextResponse.json(names)
  } catch (err) {
    console.error('GET /api/consumables/names error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
