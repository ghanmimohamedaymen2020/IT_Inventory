import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"
import { auth } from "@/lib/auth"

const prisma = new PrismaClient()

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

async function resolveSession() {
  const devSession = await getDevSession()
  if (devSession?.user) {
    return devSession
  }

  const nextAuthSession = await auth()
  if (nextAuthSession?.user) {
    return nextAuthSession
  }

  return null
}

export async function GET() {
  try {
    const screens = await prisma.screen.findMany({
      include: {
        machine: {
          select: {
            machineName: true,
            inventoryCode: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ screens })
  } catch (error) {
    console.error("Erreur lors de la récupération des écrans:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des écrans" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function POST(request: Request) {
  try {
    const session = await resolveSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    console.debug("POST /api/screens session", {
      userId: session.user.id,
      email: session.user.email,
      companyId: session.user.companyId,
      role: session.user.role,
    })

    const body = await request.json()
    const { brand, serialNumber, model, size, resolution, purchaseDate, warrantyDate, machineId, companyId } = body

    if (!brand || !serialNumber) {
      return NextResponse.json(
        { error: "Marque et numéro de série sont requis" },
        { status: 400 }
      )
    }

    // Utiliser companyId du body ou de la session
    const targetCompanyId = companyId || session.user.companyId

    // Récupérer le code de la compagnie
    const company = await prisma.company.findUnique({
      where: { id: targetCompanyId }
    })

    if (!company) {
      console.warn("POST /api/screens: compagnie introuvable", targetCompanyId)
      return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 })
    }

    // Générer un code d'inventaire automatique pour les écrans
    const sequence = await prisma.inventorySequence.upsert({
      where: { 
        companyCode_assetType: {
          companyCode: company.code,
          assetType: 'SCREEN'
        }
      },
      create: { 
        companyCode: company.code,
        assetType: 'SCREEN',
        lastNumber: 1
      },
      update: { 
        lastNumber: { increment: 1 } 
      }
    })

    const inventoryCode = `${company.code}-SCREEN-${String(sequence.lastNumber).padStart(4, '0')}`

    const screen = await prisma.screen.create({
      data: {
        brand,
        serialNumber,
        inventoryCode,
        model: model || null,
        size: size || null,
        resolution: resolution || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        warrantyDate: warrantyDate ? new Date(warrantyDate) : null,
        machineId: machineId || null,
        companyId: targetCompanyId,
      },
      include: {
        machine: true,
      },
    })

    return NextResponse.json({ screen }, { status: 201 })
  } catch (error) {
    console.error("Erreur lors de la création de l'écran:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'écran" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
