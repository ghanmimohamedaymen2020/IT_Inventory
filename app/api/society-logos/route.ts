import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

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

// Upload logo de société (super_admin seulement)
export async function POST(request: NextRequest) {
  try {
    const session = await getDevSession()
    
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Seul le super_admin peut gérer les logos.' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File
    const companyName = formData.get('companyName') as string

    if (!file || !companyName) {
      return NextResponse.json({ error: 'Fichier et nom de société requis' }, { status: 400 })
    }

    // Vérifier le type de fichier
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Type de fichier non autorisé. Utilisez PNG, JPG ou WEBP.' },
        { status: 400 }
      )
    }

    // Vérifier la taille (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Fichier trop volumineux. Maximum 5MB.' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Générer un nom de fichier sécurisé
    const safeCompanyName = companyName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const extension = file.name.split('.').pop()
    const filename = `${safeCompanyName}-${Date.now()}.${extension}`
    const filepath = join(process.cwd(), 'public', 'logos', filename)

    // Sauvegarder le fichier
    await writeFile(filepath, buffer)

    return NextResponse.json({
      message: 'Logo uploadé avec succès',
      logoPath: `/logos/${filename}`
    })

  } catch (error) {
    console.error('Erreur upload logo société:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du logo' },
      { status: 500 }
    )
  }
}
