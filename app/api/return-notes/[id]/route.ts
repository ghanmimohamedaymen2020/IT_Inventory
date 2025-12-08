import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const returnNote = await prisma.returnNote.findUnique({
      where: { id: params.id },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        equipments: true,
      },
    })

    if (!returnNote) {
      return NextResponse.json(
        { error: "Bon de retour non trouvé" },
        { status: 404 }
      )
    }

    return NextResponse.json({ returnNote })
  } catch (error) {
    console.error("Erreur lors de la récupération du bon de retour:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération du bon de retour" },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
