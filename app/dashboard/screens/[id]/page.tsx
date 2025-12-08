import { notFound } from "next/navigation"
import { PrismaClient } from "@prisma/client"
import { ScreenEditForm } from "@/components/screens/screen-edit-form"

const prisma = new PrismaClient()

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

  await prisma.$disconnect()

  if (!screen) {
    notFound()
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Modifier l'écran</h1>
      <ScreenEditForm screen={screen} />
    </div>
  )
}
