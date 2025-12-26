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

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams
    const companyId = q.get('companyId') || undefined

    const where: any = {}
    if (companyId) where.companyId = companyId

    const items = await prisma.consumable.findMany({
      where,
      include: { type: true, company: true }
    })

    return NextResponse.json({ consumables: items })
  } catch (err) {
    console.error('GET /api/consumables', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })
    }

    const data = await req.json()
    const { typeName, typeCode, companyId, initialQuantity = 0, minimumStock, note } = data

    if (!typeName || !companyId) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

    // create or find type
    let type = await prisma.consumableType.findUnique({ where: { name: typeName } })
    if (!type) {
      type = await prisma.consumableType.create({ data: { name: typeName, code: typeCode } })
    }

    // create consumable for company
    const consumable = await prisma.consumable.create({
      data: {
        typeId: type.id,
        companyId,
        quantity: initialQuantity,
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
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'
import { requireAdminOrSuperAdmin, requireAuthenticated } from '@/lib/permissions'

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

export async function GET(request: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // allow super_admin to pass ?companyId= to view other companies
    const url = new URL(request.url)
    const qCompanyId = url.searchParams.get('companyId')

    const companyId = session.user.role === 'super_admin' && qCompanyId ? qCompanyId : session.user.companyId

    const consumables = await prisma.consumable.findMany({
      where: { companyId },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(consumables)
  } catch (error) {
    console.error('GET /api/consumables error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Only admin or super_admin can create consumables
    try { requireAdminOrSuperAdmin(session) } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { name, sku, quantity = 0, minThreshold = null, companyId: requestedCompanyId } = body

    if (!name) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }

    const companyId = session.user.role === 'super_admin' && requestedCompanyId ? requestedCompanyId : session.user.companyId

    // verify company exists
    const company = await prisma.company.findUnique({ where: { id: companyId } })
    if (!company) return NextResponse.json({ error: 'Société introuvable' }, { status: 400 })

    // Check uniqueness per company
    const existing = await prisma.consumable.findFirst({ where: { companyId, name } })
    if (existing) return NextResponse.json({ error: 'Consommable déjà existant pour cette société' }, { status: 400 })

    const consumable = await prisma.consumable.create({
      data: {
        name,
        sku: sku || null,
        quantity: Number(quantity) || 0,
        minThreshold: minThreshold === null ? null : Number(minThreshold),
        companyId,
      }
    })

    return NextResponse.json(consumable, { status: 201 })
  } catch (error) {
    console.error('POST /api/consumables error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
