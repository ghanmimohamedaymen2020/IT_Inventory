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
    // consumable names are non-sensitive; allow public access to populate UI
    const rows = await prisma.consumable.findMany({ distinct: ['typeId'], select: { type: { select: { name: true } } }, orderBy: { type: { name: 'asc' } } })
    const names = rows.map(r => r.type?.name).filter(Boolean as any)
    return NextResponse.json(names)
  } catch (err) {
    console.error('GET /api/consumable-names error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
