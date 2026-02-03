import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    await prisma.notification.update({ where: { id }, data: { read: true } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('POST /api/notifications/[id]/read', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
