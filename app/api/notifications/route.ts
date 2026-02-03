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
      const sa = await auth()
      if (!sa || !sa.user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
      session = { user: { id: sa.user.id as string, email: sa.user.email as string, role: sa.user.role as string, companyId: sa.user.companyId as string } }
    }

    // Build company scope
    const where: any = {}
    if (session.user.role !== 'super_admin') {
      if (!session.user.companyId) return NextResponse.json({ error: 'Utilisateur sans société assignée' }, { status: 403 })
      where.companyId = session.user.companyId
    }

    // First try to return persisted notifications for the company
    const notifications = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })

    if (notifications.length > 0) {
      return NextResponse.json(notifications)
    }

    // If no persisted notifications exist yet, compute low-stock consumables and persist them
    const all = await prisma.consumable.findMany({ where, include: { type: true } })
    const lowFiltered = all.filter(c => c.minimumStock !== null && c.quantity <= (c.minimumStock as number))

    if (lowFiltered.length === 0) {
      return NextResponse.json([])
    }

    // Create Notification entries for each low-stock consumable
    const toCreate = lowFiltered.map(c => ({
      companyId: c.companyId,
      type: 'low_stock',
      message: `Consommable ${c.type?.name ?? 'Inconnu'} faible: ${c.quantity}/${c.minimumStock}`,
      data: { consumableId: c.id, quantity: c.quantity, minimumStock: c.minimumStock }
    }))

    try {
      // createMany may skip duplicates; keep it simple
      await prisma.notification.createMany({ data: toCreate, skipDuplicates: true })
    } catch (err) {
      console.error('Failed to create notifications', err)
    }

    const created = await prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })
    return NextResponse.json(created)
  } catch (err) {
    console.error('GET /api/notifications', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
