import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import { cookies } from "next/headers"
import { prisma } from "@/lib/db"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json({ error: "Email requis" }, { status: 400 })
    }

    // Chercher l'utilisateur dans la base de données
    let user = await prisma.user.findUnique({
      where: { email },
      include: { company: true }
    })

    // Si l'utilisateur n'existe pas, on retourne une erreur
    if (!user) {
      return NextResponse.json({ 
        error: "Utilisateur non trouvé. Veuillez contacter un administrateur." 
      }, { status: 404 })
    }

    // Créer un token JWT simple
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "secret")
    const token = await new SignJWT({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
      role: user.role,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(secret)

    // Définir le cookie de session
    const cookieStore = await cookies()
    cookieStore.set("dev-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 jours
      path: "/",
    })

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        company: user.company
      } 
    })
  } catch (error) {
    console.error("Erreur dev-login:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

