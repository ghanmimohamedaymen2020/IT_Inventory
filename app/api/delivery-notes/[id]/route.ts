import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deliveryNote = await prisma.deliveryNote.findUnique({
      where: {
        id: params.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        equipments: {
          select: {
            id: true,
            type: true,
            serialNumber: true,
            brand: true,
            model: true,
            inventoryCode: true,
          }
        }
      }
    })

    if (!deliveryNote) {
      return NextResponse.json(
        { error: "Bon de livraison introuvable" },
        { status: 404 }
      )
    }

    return NextResponse.json(deliveryNote)
  } catch (error) {
    console.error("Erreur récupération bon de livraison:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du bon de livraison" },
      { status: 500 }
    )
  }
}
