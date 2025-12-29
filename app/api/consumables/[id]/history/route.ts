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

    // Use the generated client if available, otherwise fall back to a raw query so
    // the route works even before `prisma generate` / `db push` are run during development.
    if ((prisma as any).consumableHistory && typeof (prisma as any).consumableHistory.findMany === 'function') {
      try {
        const histories = await (prisma as any).consumableHistory.findMany({
          where: { consumableId: id },
          orderBy: { createdAt: 'desc' },
          include: { user: true, recipient: true }
        })
        return NextResponse.json(histories)
      } catch (err) {
        console.warn('prisma.consumableHistory.findMany failed, falling back to raw SQL', err)
        // fall through to raw SQL fallback
      }
    }

    // Fallback raw SQL: select from ConsumableHistory and join user for name
    const raw = await prisma.$queryRaw`
      SELECT ch.id, ch.change, ch.reason, ch."userId", ch."recipientId", ch."deliveryNoteId", ch."returnNoteId", ch."createdAt",
             u."firstName" as user_first, u."lastName" as user_last,
             r."firstName" as recipient_first, r."lastName" as recipient_last
      FROM "ConsumableHistory" ch
      LEFT JOIN "User" u ON u.id = ch."userId"
      LEFT JOIN "User" r ON r.id = ch."recipientId"
      WHERE ch."consumableId" = ${id}
      ORDER BY ch."createdAt" DESC
    `

    // Map raw rows to a consistent shape
    const mapped = (raw as any[]).map(r => ({
      id: r.id,
      change: r.change,
      reason: r.reason,
      user: r.user_first && r.user_last ? `${r.user_first} ${r.user_last}` : null,
      recipient: r.recipient_first && r.recipient_last ? `${r.recipient_first} ${r.recipient_last}` : null,
      deliveryNoteId: r.deliveryNoteId,
      returnNoteId: r.returnNoteId,
      createdAt: r.createdAt,
    }))

    return NextResponse.json(mapped)
  } catch (error) {
    console.error('GET /api/consumables/[id]/history error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
