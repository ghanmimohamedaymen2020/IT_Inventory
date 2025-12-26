import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/db'
import * as xlsx from 'xlsx'

type PreviewResult = {
  created: number
  updated: number
  errors: Array<{ row: number; message: string }>
  previewRows: Array<{ row: number; data: Record<string, string> }>
}

function normalizeRow(r: any) {
  const out: Record<string, any> = {}
  Object.keys(r || {}).forEach((k) => {
    const nk = k.toString().trim().toLowerCase().replace(/\s+/g, '')
    out[nk] = r[k]
  })
  return out
}

async function getDevSession() {
  try {
    const cookieStore = await cookies()
    const devSession = cookieStore.get('dev-session')
    if (!devSession) return null
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'secret')
    const { payload } = await jwtVerify(devSession.value, secret)
    return { user: { id: payload.sub as string, email: payload.email as string, role: payload.role as string, companyId: payload.companyId as string } }
  } catch (err) {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })

    const form = await req.formData()
    const preview = String(form.get('preview') ?? '') === 'true'
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })

    let rows: any[] = []
    const name = file.name || ''
    if (name.endsWith('.csv') || name.endsWith('.txt') || file.type === 'text/csv') {
      const text = await file.text()
      const wb = xlsx.read(text, { type: 'string' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' })
    } else {
      const buffer = await file.arrayBuffer()
      const wb = xlsx.read(new Uint8Array(buffer), { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      rows = xlsx.utils.sheet_to_json(sheet, { defval: '' })
    }

    let created = 0
    let updated = 0
    const errors: any[] = []
    const previewRows: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i]
      const row = normalizeRow(raw)

      const serial = (row['serialnumber'] || row['serial'] || '').toString().trim()
      if (!serial) {
        errors.push({ row: i + 1, error: 'SerialNumber manquant' })
        continue
      }

      // Resolve company
      let companyId: string | null = null
      if (row['companyid']) {
        const c = await prisma.company.findUnique({ where: { id: row['companyid'].toString() } })
        if (c) companyId = c.id
      }
      if (!companyId && row['companycode']) {
        const c = await prisma.company.findFirst({ where: { code: row['companycode'].toString() } })
        if (c) companyId = c.id
      }
      if (!companyId && row['company']) {
        const c = await prisma.company.findFirst({ where: { name: row['company'].toString() } })
        if (c) companyId = c.id
      }
      if (!companyId) companyId = session.user.companyId || null
      if (!companyId) {
        errors.push({ row: i + 1, serial, error: 'Société introuvable' })
        continue
      }

      const typeRaw = (row['type'] || '').toString().toLowerCase()
      const type = typeRaw === 'screen' || typeRaw === 'ecran' || typeRaw === 'écran' ? 'screen' : 'machine'

      const inventoryCode = (row['inventorycode'] || row['inv'] || row['inventaire'] || '').toString().trim()
      const machineName = (row['machinename'] || row['name'] || row['computername'] || '').toString().trim() || (row['model'] || '').toString().trim()
      const vendor = (row['brand'] || row['vendor'] || '').toString().trim()
      const model = (row['model'] || '').toString().trim()
      const acquisitionDateStr = (row['acquisitiondate'] || row['purchasedate'] || row['purchaseDate'] || '').toString().trim()
      const acquisitionDate = acquisitionDateStr ? new Date(acquisitionDateStr) : new Date()
      const assetStatus = (row['assetstatus'] || row['status'] || row['etat'] || '').toString().trim() || 'en_stock'
      const userEmail = (row['useremail'] || row['user'] || row['owner'] || '').toString().trim()

      try {
        if (preview) previewRows.push({ row: i + 1, serial, type, inventoryCode, vendor, model })

        if (!preview) {
          if (type === 'machine') {
            const existing = await prisma.machine.findUnique({ where: { serialNumber: serial } })
            let userId: string | undefined = undefined
            if (userEmail) {
              const user = await prisma.user.findUnique({ where: { email: userEmail } })
              if (user) userId = user.id
            }

            const data: any = {
              serialNumber: serial,
              inventoryCode: inventoryCode || `INV-${serial}`,
              machineName: machineName || `Machine ${serial}`,
              type: 'machine',
              vendor: vendor || '',
              model: model || '',
              acquisitionDate: acquisitionDate,
              assetStatus: assetStatus,
              companyId,
              userId: userId || null,
            }

            if (existing) {
              await prisma.machine.update({ where: { id: existing.id }, data })
              updated++
            } else {
              await prisma.machine.create({ data })
              created++
            }
          } else {
            // screen
            const existing = await prisma.screen.findUnique({ where: { serialNumber: serial } })
            const data: any = {
              serialNumber: serial,
              inventoryCode: inventoryCode || `INV-${serial}`,
              brand: vendor || '',
              model: model || '',
              size: (row['size'] || '').toString().trim() || null,
              resolution: (row['resolution'] || '').toString().trim() || null,
              purchaseDate: acquisitionDateStr ? new Date(acquisitionDateStr) : null,
              assetStatus: assetStatus,
              companyId,
            }
            if (existing) {
              await prisma.screen.update({ where: { id: existing.id }, data })
              updated++
            } else {
              await prisma.screen.create({ data })
              created++
            }
          }
        }
      } catch (err: any) {
        errors.push({ row: i + 1, serial, error: err?.message || 'Erreur base de données' })
      }
    }

    if (preview) return NextResponse.json({ created, updated, errors, previewRows }, { status: 200 })

    return NextResponse.json({ created, updated, errors }, { status: 200 })
  } catch (err: any) {
    console.error('Erreur import machines:', err)
    return NextResponse.json({ error: 'Erreur serveur', detail: err?.message || null }, { status: 500 })
  }
}

export const runtime = 'node'
