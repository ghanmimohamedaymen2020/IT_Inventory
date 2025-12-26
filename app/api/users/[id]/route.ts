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
  { params }: { params: { id: string } }
) {
  try {
    let session = await getDevSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier les permissions
    if (session.user.role !== "super_admin" && session.user.role !== "company_admin") {
      return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 })
    }

    const data = await req.json()

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Vérifier si l'email est déjà utilisé par un autre utilisateur
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email }
      })

      if (emailExists) {
        return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 })
      }
    }

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: data.role,
        companyId: data.companyId || existingUser.companyId,
        department: data.department || null,
        office: data.office || null,
        office365Subscription: data.office365Subscription ?? existingUser.office365Subscription,
        globalEmail: data.globalEmail ?? existingUser.globalEmail,
      },
      include: {
        company: true
      }
    })

    // Gérer les emails supplémentaires
    if (data.additionalEmails && Array.isArray(data.additionalEmails)) {
      // Supprimer les anciens emails supplémentaires
      await prisma.userEmail.deleteMany({
        where: { userId: params.id }
      })

      // Créer les nouveaux emails supplémentaires
      if (data.additionalEmails.length > 0) {
        await prisma.userEmail.createMany({
          data: data.additionalEmails.map((item: any) => ({
            email: typeof item === 'string' ? item : item.email,
            userId: params.id,
            isPrimary: false,
          }))
        })
      }
    }

    return NextResponse.json({ user }, { status: 200 })
  } catch (error: any) {
    console.error("Erreur PATCH /api/users/[id]:", error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    let session = await getDevSession()
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier les permissions
    if (session.user.role !== "super_admin" && session.user.role !== "company_admin") {
      return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 })
    }

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id: params.id }
    })

    if (!existingUser) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 })
    }

    // Ne pas permettre de supprimer son propre compte
    if (existingUser.id === session.user.id) {
      return NextResponse.json({ error: "Vous ne pouvez pas supprimer votre propre compte" }, { status: 400 })
    }

    // Option sécurisée : réaffecter les références (createdBy/installedBy/etc.)
    // si le paramètre `reassign=yes` est présent. On réaffecte vers l'utilisateur courant.
    const  reassign = req.nextUrl?.searchParams.get('reassign') === 'yes'

    if (reassign) {
      // Effectuer plusieurs updates dans une transaction pour éviter les violations FK
      await prisma.$transaction([
        prisma.deliveryNote.updateMany({ where: { createdById: params.id }, data: { createdById: session.user.id } }),
        prisma.returnNote.updateMany({ where: { createdById: params.id }, data: { createdById: session.user.id } }),
        prisma.softwareInstallation.updateMany({ where: { installedById: params.id }, data: { installedById: session.user.id } }),
        prisma.installationSheet.updateMany({ where: { technicianId: params.id }, data: { technicianId: session.user.id } }),
        prisma.machine.updateMany({ where: { userId: params.id }, data: { userId: null } }),
        prisma.screen.updateMany({ where: { userId: params.id }, data: { userId: null } }),
      ])
    }

    // Supprimer l'utilisateur
    await prisma.user.delete({ where: { id: params.id } })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error: any) {
    console.error("Erreur DELETE /api/users/[id]:", error)
    // Si c'est une erreur Prisma, exposer le code pour le debug
    if (error?.code) {
      return NextResponse.json({ error: "Erreur serveur", code: error.code, meta: error.meta || null }, { status: 500 })
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
