import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { auth } from '@/lib/auth'

async function getDevSession() {
  const cookieStore = await cookies()
  const devSession = cookieStore.get('dev-session')
  if (!devSession) return null
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'secret')
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
    // Prefer dev-session cookie for local testing
    let session = await getDevSession()
    if (!session) {
      const sa = await auth()
      if (sa && sa.user) {
        session = { user: { id: sa.user.id as string, email: sa.user.email as string, role: sa.user.role as string, companyId: sa.user.companyId as string } }
      }
    }

    return NextResponse.json({ session })
  } catch (error) {
    console.error('/api/debug/session', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
