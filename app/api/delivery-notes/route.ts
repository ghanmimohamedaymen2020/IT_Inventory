import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const deliveryNotes = await prisma.deliveryNote.findMany({
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(deliveryNotes)
  } catch (error) {
    console.error("Erreur récupération bons de livraison:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des bons de livraison" },
      { status: 500 }
    )
  }
}
