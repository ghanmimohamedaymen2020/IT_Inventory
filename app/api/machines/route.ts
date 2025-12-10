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
    // NOTE: retired machines should be visible on the machines page by default.
    const whereClause: any = {}
    if (statusFilter) {
      // Si un filtre explicite est fourni, utiliser tel quel
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

    // Déterminer la compagnie cible: utiliser `data.companyId` si fourni (avec contrôle),
    // sinon utiliser la compagnie de la session utilisateur.
    const requestedCompanyId = (data as any).companyId as string | undefined

    // Si l'utilisateur demande une autre compagnie, vérifier les permissions basiques
    if (requestedCompanyId && requestedCompanyId !== session.user.companyId && session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Permission refusée pour choisir cette société' }, { status: 403 })
    }

    // Trouver la compagnie cible
    let targetCompany = null
    if (requestedCompanyId) {
      targetCompany = await prisma.company.findUnique({ where: { id: requestedCompanyId } })
      if (!targetCompany) {
        return NextResponse.json({ error: 'Compagnie demandée introuvable' }, { status: 404 })
      }
    } else {
      targetCompany = await prisma.company.findUnique({ where: { id: session.user.companyId } })
      if (!targetCompany) {
        // Si l'utilisateur n'a pas de compagnie rattachée, créer/associer une compagnie par défaut
        console.warn(`POST /api/machines: compagnie introuvable pour user ${session.user.id}. Attachement à la compagnie par défaut.`)

        let defaultCompany = await prisma.company.findFirst({ where: { name: 'Compagnie par défaut' } })
        if (!defaultCompany) {
          defaultCompany = await prisma.company.create({ data: { name: 'Compagnie par défaut', code: 'DEFAULT' } })
        }

        // Mettre à jour l'utilisateur pour l'attacher à la compagnie par défaut
        try {
          await prisma.user.update({ where: { id: session.user.id }, data: { companyId: defaultCompany.id } })
        } catch (err) {
          console.error("Impossible d'attacher l'utilisateur à la compagnie par défaut:", err)
          return NextResponse.json({ error: "Erreur lors de l'attachement à la compagnie" }, { status: 500 })
        }

        targetCompany = defaultCompany
      }
    }

    // Générer un code d'inventaire automatique en utilisant la compagnie cible.
    const companyCode = targetCompany.code ?? targetCompany.id.substring(0, 4).toUpperCase()

    const sequence = await prisma.inventorySequence.upsert({
      where: {
        companyCode_assetType: {
          companyCode,
          assetType: 'ASSET'
        }
      },
      create: {
        companyCode,
        assetType: 'ASSET',
        lastNumber: 1
      },
      update: {
        lastNumber: { increment: 1 }
      }
    })

    const inventoryCode = `${companyCode}-ASSET-${String(sequence.lastNumber).padStart(4, '0')}`

    // Déterminer l'assetStatus demandé et appliquer les règles de permission
    const requestedStatus = (data as any).status as string | undefined
    const assetStatus = requestedStatus === 'active' ? 'en_service' :
                        requestedStatus === 'maintenance' ? 'maintenance' :
                        requestedStatus === 'storage' ? 'en_stock' :
                        requestedStatus === 'retiré' ? 'retiré' :
                        // Par défaut, placer en stock plutôt que marquer retiré
                        'en_stock'

    // Seul un super_admin peut marquer une machine comme 'retiré'
    if (assetStatus === 'retiré' && session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Seul super_admin peut marquer une machine comme retirée' }, { status: 403 })
    }

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
        assetStatus,
        companyId: targetCompany.id,
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
