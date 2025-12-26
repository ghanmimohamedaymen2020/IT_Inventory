import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'
import { requireAdminOrSuperAdmin } from '@/lib/permissions'

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
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const url = new URL(request.url)
    const qCompanyId = url.searchParams.get('companyId')
    const companyId = session.user.role === 'super_admin' && qCompanyId ? qCompanyId : session.user.companyId

    const items = await prisma.consumable.findMany({
      where: { companyId },
      include: { type: true, company: true },
      orderBy: { id: 'asc' }
    })

    // Map to the front-end shape expected by `components/consumables/consumable-list.tsx`
    const mapped = items.map(i => ({
      id: i.id,
      name: i.type?.name ?? 'Unknown',
      sku: null,
      quantity: i.quantity,
      minThreshold: i.minimumStock ?? null,
      companyId: i.companyId
    }))

    return NextResponse.json(mapped)
  } catch (err) {
    console.error('GET /api/consumables', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // require admin or super_admin
    try { requireAdminOrSuperAdmin(session) } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Accès refusé' }, { status: 403 })
    }

    const data = await request.json()

    // Support two payload shapes:
    // - { name, companyId, quantity, minThreshold } (frontend matrix uses this)
    // - { typeName, typeCode, companyId, initialQuantity } (legacy/type-based)

    if (data.name) {
      const { name, quantity = 0, minThreshold = null, companyId: requestedCompanyId } = data
      const companyId = session.user.role === 'super_admin' && requestedCompanyId ? requestedCompanyId : session.user.companyId
      if (!name) return NextResponse.json({ error: 'Nom requis' }, { status: 400 })

      // find or create consumable type
      let type = await prisma.consumableType.findUnique({ where: { name } })
      if (!type) {
        type = await prisma.consumableType.create({ data: { name } })
      }

      // check existing consumable for this company + type
      const existing = await prisma.consumable.findFirst({ where: { companyId, typeId: type.id }, include: { type: true, company: true } })
      if (existing) {
        const mappedExisting = {
          id: existing.id,
          name: existing.type?.name ?? 'Unknown',
          sku: null,
          quantity: existing.quantity,
          minThreshold: existing.minimumStock ?? null,
          companyId: existing.companyId
        }
        return NextResponse.json(mappedExisting)
      }

      const consumable = await prisma.consumable.create({
        data: {
          typeId: type.id,
          companyId,
          quantity: Number(quantity) || 0,
          minimumStock: minThreshold === null ? null : Number(minThreshold),
        },
        include: { type: true, company: true }
      })
      const mapped = {
        id: consumable.id,
        name: consumable.type?.name ?? 'Unknown',
        sku: null,
        quantity: consumable.quantity,
        minThreshold: consumable.minimumStock ?? null,
        companyId: consumable.companyId
      }
      return NextResponse.json(mapped, { status: 201 })
    }

    // fallback: type-based creation
    const { typeName, typeCode, companyId, initialQuantity = 0, minimumStock, note } = data
    if (!typeName || !companyId) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    let type = await prisma.consumableType.findUnique({ where: { name: typeName } })
    if (!type) {
      type = await prisma.consumableType.create({ data: { name: typeName, code: typeCode ?? null } })
    }

    const consumable = await prisma.consumable.create({
      data: {
        typeId: type.id,
        companyId,
        quantity: Number(initialQuantity) || 0,
        minimumStock: minimumStock ?? null,
        note: note ?? null
      },
      include: { type: true, company: true }
    })

    return NextResponse.json({ consumable }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/consumables', err)
    if (err?.code === 'P2002') return NextResponse.json({ error: 'Déjà existant' }, { status: 400 })
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
