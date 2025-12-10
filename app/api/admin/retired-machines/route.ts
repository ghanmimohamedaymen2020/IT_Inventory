import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { auth } from "@/lib/auth"

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

async function resolveSession() {
  const devSession = await getDevSession()
  if (devSession?.user) return devSession
  const nextAuthSession = await auth()
  if (nextAuthSession?.user) return nextAuthSession
  return null
}

// GET: list retired machines. If user is company_admin, only list machines for their company.
export async function GET() {
  try {
    const session = await resolveSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const role = session.user.role
    if (role !== 'super_admin' && role !== 'company_admin') {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    const whereClause: any = { assetStatus: 'retiré' }
    if (role === 'company_admin') {
      whereClause.companyId = session.user.companyId
    }

    const machines = await prisma.machine.findMany({
      where: whereClause,
      include: {
        company: true,
        user: true,
        screens: true,
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json({ machines })
  } catch (error) {
    console.error('Erreur GET /api/admin/retired-machines:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

// PATCH: restore a retired machine (set assetStatus to 'en_stock')
export async function PATCH(request: Request) {
  try {
    const session = await resolveSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const role = session.user.role
    if (role !== 'super_admin' && role !== 'company_admin') {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action } = body as { id?: string, action?: string }
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    // Only allow restore action for now
    if (action === 'restore') {
      // If company_admin, ensure the machine belongs to their company
      if (role === 'company_admin') {
        const m = await prisma.machine.findUnique({ where: { id } })
        if (!m || m.companyId !== session.user.companyId) {
          return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
        }
      }

      const updated = await prisma.machine.update({
        where: { id },
        data: { assetStatus: 'en_stock' },
        include: { company: true, user: true }
      })

      return NextResponse.json({ machine: updated })
    }

    return NextResponse.json({ error: 'Action non supportée' }, { status: 400 })
  } catch (error) {
    console.error('Erreur PATCH /api/admin/retired-machines:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
