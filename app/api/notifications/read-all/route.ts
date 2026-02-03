import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request) {
  try {
    // Optional companyId in body to scope
    const body = await req.json().catch(() => ({}))
    const companyId = body.companyId || undefined

    const where: any = {}
    if (companyId) where.companyId = companyId

    await prisma.notification.updateMany({ where, data: { read: true } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/notifications/read-all', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
