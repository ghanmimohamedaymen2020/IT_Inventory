import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

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
