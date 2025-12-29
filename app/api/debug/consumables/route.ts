import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

async function getDevSession() {
  const cookieStore = await cookies()
  const devSession = cookieStore.get('dev-session')
  if (!devSession) return null
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'secret')
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

export async function GET(request: NextRequest) {
  try {
    let session = await getDevSession()
    if (!session) {
      try {
        const sa = await auth()
        if (sa && sa.user) session = { user: { id: sa.user.id as string, email: sa.user.email as string, role: sa.user.role as string, companyId: sa.user.companyId as string } }
      } catch (e) {
        // ignore
      }
    }

    const url = new URL(request.url)
    const qCompanyId = url.searchParams.get('companyId')
    const companyId = qCompanyId || session?.user?.companyId
    if (!companyId) return NextResponse.json({ error: 'companyId manquant' }, { status: 400 })

    const items = await prisma.consumable.findMany({
      where: { companyId },
      include: { type: true, company: true },
      orderBy: { id: 'asc' }
    })

    const mapped = items.map(i => ({ id: i.id, name: i.type?.name ?? 'Unknown', quantity: i.quantity, minimumStock: i.minimumStock, companyId: i.companyId }))
    return NextResponse.json({ companyId, count: mapped.length, consumables: mapped })
  } catch (err) {
    console.error('/api/debug/consumables', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
