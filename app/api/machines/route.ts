import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { prisma } from "@/lib/db"

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

export async function GET(req: NextRequest) {
  try {
    let session = await getDevSession()
    if (!session) {
      session = await auth()
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Récupérer le paramètre de filtre status
    const { searchParams } = new URL(req.url)
    const statusFilter = searchParams.get('status')

    // Construire la requête avec filtres optionnels
    const whereClause: any = {}
    if (statusFilter) {
      whereClause.assetStatus = statusFilter
    }

    // Récupérer les machines depuis PostgreSQL
    const machines = await prisma.machine.findMany({
      where: whereClause,
      include: {
        company: true,
        user: true,
        screens: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ machines })
  } catch (error) {
    console.error("Erreur GET /api/machines:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    let session = await getDevSession()
    if (!session) {
      session = await auth()
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const data = await req.json()

    // Récupérer le code de la compagnie
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId }
    })

    if (!company) {
      return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 })
    }

    // Générer un code d'inventaire automatique
    const sequence = await prisma.inventorySequence.upsert({
      where: { 
        companyCode_assetType: {
          companyCode: company.code,
          assetType: 'ASSET'
        }
      },
      create: { 
        companyCode: company.code,
        assetType: 'ASSET',
        lastNumber: 1
      },
      update: { 
        lastNumber: { increment: 1 } 
      }
    })

    const inventoryCode = `${company.code}-ASSET-${String(sequence.lastNumber).padStart(4, '0')}`

    // Créer la machine dans PostgreSQL
    const machine = await prisma.machine.create({
      data: {
        inventoryCode,
        serialNumber: data.serialNumber,
        machineName: data.machineName || `${data.brand} ${data.model}`,
        type: data.type,
        vendor: data.brand,
        model: data.model,
        acquisitionDate: data.purchaseDate ? new Date(data.purchaseDate) : new Date(),
        windowsVersion: data.os,
        cpu: data.processor,
        ram: data.ram,
        disk: data.storage,
        warrantyDate: data.warrantyEndDate ? new Date(data.warrantyEndDate) : null,
        assetStatus: data.status === 'active' ? 'en_service' : 
                     data.status === 'maintenance' ? 'maintenance' : 
                     data.status === 'storage' ? 'en_stock' : 'retiré',
        companyId: session.user.companyId,
      },
      include: {
        company: true
      }
    })

    return NextResponse.json({ machine }, { status: 201 })
  } catch (error) {
    console.error("Erreur POST /api/machines:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
