import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("dev-session")
    
    return NextResponse.json({ success: true, message: "Session supprimée" })
  } catch (error) {
    console.error("Erreur clear-session:", error)
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
