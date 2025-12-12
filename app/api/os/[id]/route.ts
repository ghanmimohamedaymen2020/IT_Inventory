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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getDevSession()
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (slug !== undefined) updateData.slug = slug

    // Guard for missing Prisma model
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!prisma || !(prisma as any).operatingSystem) {
      console.warn('Prisma client missing `operatingSystem`. Cannot update OS until you run `npx prisma generate` and migrate.')
      return NextResponse.json({ error: 'OS management not available. Please run Prisma generate/migrate.' }, { status: 501 })
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const updated = await (prisma as any).operatingSystem.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur mise à jour OS:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getDevSession()
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })
    }
    // Guard for missing Prisma model
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (!prisma || !(prisma as any).operatingSystem) {
      console.warn('Prisma client missing `operatingSystem`. Cannot delete OS until you run `npx prisma generate` and migrate.')
      return NextResponse.json({ error: 'OS management not available. Please run Prisma generate/migrate.' }, { status: 501 })
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const os = await (prisma as any).operatingSystem.findUnique({ where: { id: params.id } })
    if (!os) return NextResponse.json({ error: 'Non trouvé' }, { status: 404 })

    const linkedMachines = await prisma.machine.count({ where: { windowsVersion: os.name } })
    if (linkedMachines > 0) {
      return NextResponse.json({ error: `Impossible de supprimer. Utilisé par ${linkedMachines} machine(s).` }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    await (prisma as any).operatingSystem.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur suppression OS:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
