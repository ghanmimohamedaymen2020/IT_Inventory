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

export async function GET() {
  try {
    const session = await resolveSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    if (session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })
    }

    const list = await prisma.authorizedEmail.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ authorizedEmails: list })
  } catch (err) {
    console.error('Erreur GET /api/authorized-emails', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: Request) {
  try {
    const session = await resolveSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

    const body = await request.json()
    const { email, note, companyId, isActive } = body as { email?: string, note?: string, companyId?: string, isActive?: boolean }
    if (!email || typeof email !== 'string') return NextResponse.json({ error: 'Email requis' }, { status: 400 })

    const normalized = email.toLowerCase().trim()
    const existing = await prisma.authorizedEmail.findUnique({ where: { email: normalized } })
    if (existing) {
      // Update fields
      const updated = await prisma.authorizedEmail.update({ where: { email: normalized }, data: { note: note ?? existing.note, isActive: typeof isActive === 'boolean' ? isActive : existing.isActive, companyId: companyId ?? existing.companyId } })
      return NextResponse.json({ authorizedEmail: updated })
    }

    const created = await prisma.authorizedEmail.create({ data: { email: normalized, note: note ?? null, isActive: typeof isActive === 'boolean' ? isActive : true, companyId: companyId ?? null, createdById: session.user.id } })
    return NextResponse.json({ authorizedEmail: created })
  } catch (err) {
    console.error('Erreur POST /api/authorized-emails', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await resolveSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Permission refusée' }, { status: 403 })

    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requis' }, { status: 400 })

    // Hard delete
    await prisma.authorizedEmail.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Erreur DELETE /api/authorized-emails', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  } finally {
    await prisma.$disconnect()
  }
}
