import { NextRequest, NextResponse } from "next/server"
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

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await context.params
    const data = await req.json()

    // Vérifier que la machine existe
    const existingMachine = await prisma.machine.findUnique({
      where: { id }
    })

    if (!existingMachine) {
      return NextResponse.json({ error: "Machine non trouvée" }, { status: 404 })
    }

    // Mettre à jour la machine
    const machine = await prisma.machine.update({
      where: { id },
      data: {
        machineName: data.machineName,
        serialNumber: data.serialNumber,
        type: data.type,
        vendor: data.vendor,
        model: data.model,
        acquisitionDate: data.acquisitionDate,
        windowsVersion: data.windowsVersion || null,
        productKey: data.productKey || null,
        cpu: data.cpu || null,
        ram: data.ram || null,
        disk: data.disk || null,
        warrantyDate: data.warrantyDate || null,
        assetStatus: data.assetStatus,
        userId: data.userId || null,
        inventoryTicket: data.inventoryTicket,
      },
      include: {
        company: true,
        user: true,
      }
    })

    return NextResponse.json({ machine })
  } catch (error) {
    console.error("Erreur PATCH /api/machines/[id]:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { id } = await context.params

    // Vérifier que la machine existe
    const existingMachine = await prisma.machine.findUnique({
      where: { id }
    })

    if (!existingMachine) {
      return NextResponse.json({ error: "Machine non trouvée" }, { status: 404 })
    }

    // Supprimer la machine
    await prisma.machine.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Erreur DELETE /api/machines/[id]:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
