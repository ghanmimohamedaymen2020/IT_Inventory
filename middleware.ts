import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { jwtVerify } from 'jose'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pages publiques
  const publicRoutes = ['/auth/login', '/auth/error', '/api/auth']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // En développement, vérifier le cookie dev-session
  if (process.env.NODE_ENV === 'development') {
    const devSession = request.cookies.get('dev-session')
    
    if (devSession) {
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "secret")
        const { payload } = await jwtVerify(devSession.value, secret)
        
        // Autoriser seulement super_admin et admin (bloquer les users normaux)
        const userRole = payload.role as string
        if (!['super_admin', 'company_admin'].includes(userRole)) {
          const loginUrl = new URL('/auth/login', request.url)
          loginUrl.searchParams.set('error', 'Accès refusé. Seuls les administrateurs peuvent se connecter.')
          return NextResponse.redirect(loginUrl)
        }
        
        return NextResponse.next()
      } catch (error) {
        // Token invalide, rediriger vers login
        const loginUrl = new URL('/auth/login', request.url)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }
    }
  }

  // Vérifier NextAuth session
  const session = await auth()

  // Si pas authentifié et route protégée
  if (!session && !isPublicRoute) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Autoriser seulement super_admin et admin (bloquer les users normaux)
  if (session?.user?.role && !['super_admin', 'company_admin'].includes(session.user.role)) {
    const loginUrl = new URL('/auth/login', request.url)
    loginUrl.searchParams.set('error', 'Accès refusé. Seuls les administrateurs peuvent se connecter.')
    return NextResponse.redirect(loginUrl)
  }

  // Vérification des rôles pour les routes admin
  if (pathname.startsWith('/dashboard/admin')) {
    if (!session?.user?.role || !['super_admin', 'company_admin'].includes(session.user.role)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Company Admin ne peut accéder qu'à sa compagnie
  if (session?.user?.role === 'company_admin') {
    const url = new URL(request.url)
    const companyId = url.searchParams.get('companyId')
    
    if (companyId && companyId !== session.user.companyId) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)',
  ],
}
