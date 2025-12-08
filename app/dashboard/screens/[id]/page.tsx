import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { ScreenEditForm } from "@/components/screens/screen-edit-form"
import { EquipmentHistory } from "@/components/equipment/equipment-history"

export default async function ScreenEditPage({
  params,
}: {
  params: { id: string }
}) {
  const screen = await prisma.screen.findUnique({
    where: { id: params.id },
    include: {
      machine: {
        select: {
          id: true,
          machineName: true,
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
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!screen) {
    notFound()
  }

  // Récupérer l'historique des bons de livraison contenant cet écran
  const deliveryHistory = await prisma.deliveryNoteEquipment.findMany({
    where: {
      serialNumber: screen.serialNumber,
      type: 'Écran'
    },
    include: {
      deliveryNote: {
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Récupérer l'historique des bons de retour contenant cet écran
  const returnHistory = await prisma.returnNoteEquipment.findMany({
    where: {
      serialNumber: screen.serialNumber,
      type: 'screen'
    },
    include: {
      returnNote: {
        include: {
          createdBy: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Fusionner et trier l'historique
  const combinedHistory = [
    ...deliveryHistory.map(item => ({
      ...item,
      noteType: 'delivery' as const,
      note: item.deliveryNote,
      noteDate: item.deliveryNote.deliveryDate,
    })),
    ...returnHistory.map(item => ({
      ...item,
      noteType: 'return' as const,
      note: item.returnNote,
      noteDate: item.returnNote.returnDate,
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold">Modifier l'écran</h1>
      <ScreenEditForm screen={screen} />
      
      <EquipmentHistory 
        history={combinedHistory}
        equipmentType="Écran"
        equipmentName={`${screen.brand} ${screen.model || ''}`}
      />
    </div>
  )
}
