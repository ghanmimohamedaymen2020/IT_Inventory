import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"
import * as xlsx from 'xlsx'

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

function normalizeRow(r: any) {
  const out: Record<string, any> = {}
  Object.keys(r || {}).forEach(k => {
    const nk = k.toString().trim().toLowerCase().replace(/\s+/g, '')
    out[nk] = r[k]
  })
  return out
}

export async function POST(req: NextRequest) {
  try {
    const session = await getDevSession()
    if (!session?.user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    if (session.user.role !== 'super_admin') return NextResponse.json({ error: 'Permissions insuffisantes' }, { status: 403 })

    const form = await req.formData()
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

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i]
      const row = normalizeRow(raw)
      const email = (row['email'] || row['e-mail'] || row['courriel'] || '').toString().trim()
      if (!email) {
        errors.push({ row: i+1, error: 'Email manquant' })
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

      if (!companyId) {
        errors.push({ row: i+1, email, error: 'Société introuvable (companyId/companyCode/company)' })
        continue
      }

      const firstName = (row['firstname'] || row['prenom'] || '').toString().trim()
      const lastName = (row['lastname'] || row['nom'] || '').toString().trim()
      const role = (row['role'] || 'viewer').toString().trim()

      try {
        const existing = await prisma.user.findUnique({ where: { email } })
        if (existing) {
          await prisma.user.update({ where: { id: existing.id }, data: { firstName: firstName || existing.firstName, lastName: lastName || existing.lastName, role: role || existing.role, companyId } })
          updated++
        } else {
          await prisma.user.create({ data: { email, firstName: firstName || '', lastName: lastName || '', role: role || 'viewer', companyId } })
          created++
        }
      } catch (err: any) {
        errors.push({ row: i+1, email, error: err?.message || 'Erreur base de données' })
      }
    }

    return NextResponse.json({ created, updated, errors }, { status: 200 })
  } catch (error: any) {
    console.error('Erreur import users:', error)
    return NextResponse.json({ error: 'Erreur serveur', detail: error?.message || null }, { status: 500 })
  }
}
