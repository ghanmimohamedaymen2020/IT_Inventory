import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
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

export async function GET(req: NextRequest) {
  try {
    let session = await getDevSession()
    if (!session) {
      session = await auth()
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Récupérer les utilisateurs depuis PostgreSQL
    const users = await prisma.user.findMany({
      include: {
        company: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Erreur GET /api/users:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    let session = await getDevSession()
    if (!session) {
      session = await auth()
    }
    
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    // Vérifier les permissions
    if (session.user.role !== "super_admin" && session.user.role !== "company_admin") {
      return NextResponse.json({ error: "Permissions insuffisantes" }, { status: 403 })
    }

    const data = await req.json()

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existingUser) {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 })
    }

    // Vérifier que la compagnie existe
    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId }
    })

    if (!company) {
      return NextResponse.json({ error: "Compagnie non trouvée" }, { status: 404 })
    }

    // Créer l'utilisateur dans PostgreSQL
    const user = await prisma.user.create({
      data: {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || null,
        role: data.role,
        department: data.department || null,
        office: data.office || null,
        office365Subscription: data.office365Subscription || null,
        globalEmail: data.globalEmail || null,
        companyId: company.id,
      },
      include: {
        company: true
      }
    })

    // Créer les emails supplémentaires si fournis
    if (data.additionalEmails && Array.isArray(data.additionalEmails) && data.additionalEmails.length > 0) {
      await prisma.userEmail.createMany({
        data: data.additionalEmails.map((email: string) => ({
          email,
          userId: user.id,
          isPrimary: false,
        }))
      })
    }

    return NextResponse.json({ user }, { status: 201 })
  } catch (error: any) {
    console.error("Erreur POST /api/users:", error)
    
    // Gestion des erreurs Prisma
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "Cet email est déjà utilisé" }, { status: 400 })
    }
    
    if (error.code === 'P2003') {
      return NextResponse.json({ error: "Données invalides - vérifiez la compagnie" }, { status: 400 })
    }
    
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
