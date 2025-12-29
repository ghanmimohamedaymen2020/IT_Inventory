import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { userId, consumables } = body

    if (!userId) return NextResponse.json({ error: 'userId manquant' }, { status: 400 })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const shortages: Array<{ id: string | null; label: string; available: number; requested: number }> = []

    if (!Array.isArray(consumables) || consumables.length === 0) {
      return NextResponse.json({ ok: true, shortages: [] })
    }

    for (const c of consumables) {
      const qty = Number(c.quantity || 0)
      if (!qty || qty <= 0) continue

      let record = null
      if (c.consumableId) {
        record = await prisma.consumable.findUnique({ where: { id: c.consumableId }, include: { type: true } })
      } else if (c.typeId) {
        record = await prisma.consumable.findFirst({ where: { typeId: c.typeId, companyId: user.companyId }, include: { type: true } })
      } else if (c.typeName) {
        record = await prisma.consumable.findFirst({ where: { companyId: user.companyId, type: { name: c.typeName } }, include: { type: true } })
      } else if (c.name) {
        record = await prisma.consumable.findFirst({ where: { companyId: user.companyId, type: { name: c.name } }, include: { type: true } })
      }

      const available = record ? Number(record.quantity || 0) : 0
      if (available < qty) {
        const label = (record?.type?.name ?? record?.name) || c.typeName || c.name || 'consommable inconnu'
          shortages.push({ id: record?.id ?? null, label, available, requested: qty })
      }
    }

    return NextResponse.json({ ok: shortages.length === 0, shortages })
  } catch (err) {
    console.error('precheck error', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
