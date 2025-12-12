import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

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

export async function GET() {
  try {
    const session = await getDevSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    // Guard: if Prisma client hasn't been regenerated after adding the model,
    // prisma.operatingSystem may be undefined. Handle gracefully.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!prisma || !(prisma as any).operatingSystem) {
      console.warn('Prisma client does not expose `operatingSystem`. Run `npx prisma generate` and migrate the database.')
      return NextResponse.json([], { status: 200 })
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const items = await (prisma as any).operatingSystem.findMany({ orderBy: { name: 'asc' } })
    return NextResponse.json(items)
  } catch (error) {
    console.error('Erreur récupération OS:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nom requis' }, { status: 400 })
    }
    // Guard for missing Prisma model
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!prisma || !(prisma as any).operatingSystem) {
      console.warn('Prisma client missing `operatingSystem`. Cannot create OS until you run `npx prisma generate` and migrate.')
      return NextResponse.json({ error: 'OS management not available. Please run Prisma generate/migrate.' }, { status: 501 })
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const existing = await (prisma as any).operatingSystem.findFirst({ where: { name } })
    if (existing) {
      return NextResponse.json({ error: 'OS existe déjà' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const created = await (prisma as any).operatingSystem.create({ data: { name: name.trim(), slug } })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('Erreur création OS:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
