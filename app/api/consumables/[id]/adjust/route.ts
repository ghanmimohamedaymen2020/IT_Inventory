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

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    try { requireAdminOrSuperAdmin(session) } catch (err: any) {
      return NextResponse.json({ error: err.message || 'Accès refusé' }, { status: 403 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { change, reason = null, deliveryNoteId = null, returnNoteId = null } = body

    if (typeof change !== 'number' || !Number.isInteger(change)) {
      return NextResponse.json({ error: 'Le changement doit être un entier' }, { status: 400 })
    }

    // Load consumable
    const consumable = await prisma.consumable.findUnique({ where: { id } })
    if (!consumable) return NextResponse.json({ error: 'Consommable introuvable' }, { status: 404 })

    // Ensure admin belongs to the same company unless super_admin
    if (session.user.role !== 'super_admin' && session.user.companyId !== consumable.companyId) {
      return NextResponse.json({ error: 'Accès refusé pour cette société' }, { status: 403 })
    }

    // Transaction: create history and update quantity
    const [history, updated] = await prisma.$transaction([
      prisma.consumableHistory.create({
        data: {
          consumableId: id,
          change,
          reason,
          userId: session.user.id,
          deliveryNoteId: deliveryNoteId || null,
          returnNoteId: returnNoteId || null,
        }
      }),
      prisma.consumable.update({
        where: { id },
        data: { quantity: { increment: change } }
      })
    ])

    return NextResponse.json({ consumable: updated, history })
  } catch (error) {
    console.error('POST /api/consumables/[id]/adjust error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
