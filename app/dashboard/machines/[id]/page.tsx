import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { MachineEditForm } from "@/components/machines/machine-edit-form"
import { EquipmentHistory } from "@/components/equipment/equipment-history"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

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

export default async function MachineEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getDevSession()
  
  if (!session) {
    redirect("/auth/login")
  }

  const { id } = await params
  
  const machine = await prisma.machine.findUnique({
    where: { id },
    include: {
      company: true,
      user: true,
      screens: {
        select: {
          id: true,
          brand: true,
          model: true,
          inventoryCode: true,
        },
      },
    }
  })

  if (!machine) {
    notFound()
  }

  // Si la machine est marquée comme retirée, ne pas permettre la modification
  const isRetired = machine.assetStatus === 'retiré'

  // Récupérer l'historique des bons de livraison contenant cette machine
  const deliveryHistory = await prisma.deliveryNoteEquipment.findMany({
    where: {
      serialNumber: machine.serialNumber,
      type: { in: ['Laptop', 'Desktop', 'PC'] }
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

  // Récupérer l'historique des bons de retour contenant cette machine
  const returnHistory = await prisma.returnNoteEquipment.findMany({
    where: {
      serialNumber: machine.serialNumber,
      type: 'machine'
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Modifier la Machine</h1>
        <p className="text-muted-foreground mt-1">
          {machine.inventoryCode} - {machine.machineName || "Sans nom"}
        </p>
      </div>

      {isRetired ? (
        <div className="p-4 border rounded bg-yellow-50">
          <p className="text-sm text-yellow-800">Cette machine est marquée comme <strong>retirée</strong> et ne peut plus être modifiée ou réutilisée.</p>
        </div>
      ) : (
        <MachineEditForm machine={machine} />
      )}

      <EquipmentHistory 
        history={combinedHistory}
        equipmentType="Machine"
        equipmentName={machine.machineName || machine.inventoryCode}
      />
    </div>
  )
}
