import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'

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

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getDevSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    // Only company_admin or super_admin can update stock
    if (session.user.role !== 'super_admin' && session.user.role !== 'company_admin') {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const data = await req.json()
    // Only allow quantity updates via this endpoint
    if (typeof data.quantity !== 'number') return NextResponse.json({ error: 'quantity requis' }, { status: 400 })

    // Ensure company scoping for company_admin
    const existing = await prisma.consumable.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Consumable non trouvé' }, { status: 404 })
    if (session.user.role !== 'super_admin' && session.user.companyId !== existing.companyId) {
      return NextResponse.json({ error: 'Permissions insuffisantes sur cette société' }, { status: 403 })
    }

    const updated = await prisma.consumable.update({ where: { id: params.id }, data: { quantity: data.quantity } })
    return NextResponse.json({ consumable: updated })
  } catch (err) {
    console.error('PATCH /api/consumables/[id]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // This POST acts as an allocation endpoint: body { allocate: number }
  try {
    const session = await getDevSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const data = await req.json()
    const allocate = Number(data.allocate || 0)
    if (!allocate || allocate <= 0) return NextResponse.json({ error: 'allocate invalide' }, { status: 400 })

    // Transactionally decrement stock if enough
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.consumable.findUnique({ where: { id: params.id } })
      if (!current) throw new Error('NOT_FOUND')
      if (current.quantity < allocate) throw new Error('INSUFFICIENT')
      const updated = await tx.consumable.update({ where: { id: params.id }, data: { quantity: current.quantity - allocate } })
      return updated
    })

    return NextResponse.json({ consumable: result })
  } catch (err: any) {
    console.error('POST /api/consumables/[id] allocate', err)
    if (err.message === 'NOT_FOUND') return NextResponse.json({ error: 'Consumable non trouvé' }, { status: 404 })
    if (err.message === 'INSUFFICIENT') return NextResponse.json({ error: 'Stock insuffisant' }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
