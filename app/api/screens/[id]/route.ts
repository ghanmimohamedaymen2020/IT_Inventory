import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const screen = await prisma.screen.findUnique({
      where: { id: params.id },
      include: {
        machine: true,
        company: true,
      },
    })

    if (!screen) {
      return NextResponse.json(
        { error: "Écran non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Erreur lors de la récupération de l'écran:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'écran" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { brand, serialNumber, model, size, resolution, machineId, purchaseDate, warrantyDate, companyId, assetStatus } = body

    const screen = await prisma.screen.update({
      where: { id: params.id },
      data: {
        brand,
        serialNumber,
        model: model || null,
        size: size || null,
        resolution: resolution || null,
        machineId: machineId || null,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyDate: warrantyDate ? new Date(warrantyDate) : null,
        companyId,
        ...(assetStatus ? { assetStatus } : {}),
      },
      include: {
        machine: true,
        company: true,
      },
    })

    return NextResponse.json({ screen })
  } catch (error) {
    console.error("Erreur lors de la mise à jour de l'écran:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de l'écran" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getDevSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Prevent company-level admins from deleting screens
    if (session.user.role === 'company_admin') {
      return NextResponse.json({ error: 'Accès refusé. Suppression réservée aux administrateurs.' }, { status: 403 })
    }

    await prisma.screen.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur lors de la suppression de l'écran:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'écran" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
