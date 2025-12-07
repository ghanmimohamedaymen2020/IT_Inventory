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

// Liste toutes les companies (tous les utilisateurs authentifiés)
export async function GET() {
  try {
    const session = await getDevSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      )
    }

    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        logoPath: true,
        createdAt: true,
      }
    })

    return NextResponse.json(companies)

  } catch (error) {
    console.error('Erreur récupération companies:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

// Créer une nouvelle company (super_admin seulement)
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession()
    
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Seul le super_admin peut créer des sociétés.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { name, code } = body

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Nom et code requis' },
        { status: 400 }
      )
    }

    // Vérifier unicité
    const existing = await prisma.company.findFirst({
      where: {
        OR: [
          { name },
          { code }
        ]
      }
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Une société avec ce nom ou code existe déjà' },
        { status: 400 }
      )
    }

    const company = await prisma.company.create({
      data: { name, code }
    })

    return NextResponse.json(company, { status: 201 })

  } catch (error) {
    console.error('Erreur création company:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
