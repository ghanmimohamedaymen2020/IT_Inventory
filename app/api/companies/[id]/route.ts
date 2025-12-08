import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Vérifier si la société est utilisée par des machines, écrans ou utilisateurs
    const [machinesCount, screensCount, usersCount] = await Promise.all([
      prisma.machine.count({ where: { companyId: params.id } }),
      prisma.screen.count({ where: { companyId: params.id } }),
      prisma.user.count({ where: { companyId: params.id } })
    ])

    const totalUsage = machinesCount + screensCount + usersCount

    if (totalUsage > 0) {
      return NextResponse.json(
        { 
          error: `Impossible de supprimer cette société. Elle est utilisée par ${totalUsage} élément(s) (${machinesCount} machines, ${screensCount} écrans, ${usersCount} utilisateurs).` 
        },
        { status: 400 }
      )
    }

    await prisma.company.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Erreur suppression société:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, code, logoPath } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code
    if (logoPath !== undefined) updateData.logoPath = logoPath

    const company = await prisma.company.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json(company)

  } catch (error) {
    console.error('Erreur mise à jour société:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}
