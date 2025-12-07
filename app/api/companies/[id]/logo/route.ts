import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/db'
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
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession()
    
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Seul le super_admin peut gérer les logos.' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    // Vérifier que la société existe
    const company = await prisma.company.findUnique({
      where: { id }
    })

    if (!company) {
      return NextResponse.json({ error: 'Société introuvable' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('logo') as File

    if (!file) {
      return NextResponse.json({ error: 'Aucun fichier fourni' }, { status: 400 })
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

    // Générer un nom de fichier unique
    const extension = file.name.split('.').pop()
    const filename = `${company.code}-${Date.now()}.${extension}`
    const filepath = join(process.cwd(), 'public', 'logos', filename)

    // Supprimer l'ancien logo si existe
    if (company.logoPath) {
      try {
        const oldFilepath = join(process.cwd(), 'public', company.logoPath)
        await unlink(oldFilepath)
      } catch (error) {
        console.error('Erreur suppression ancien logo:', error)
      }
    }

    // Sauvegarder le nouveau fichier
    await writeFile(filepath, buffer)

    // Mettre à jour la base de données
    const updatedCompany = await prisma.company.update({
      where: { id },
      data: {
        logoPath: `/logos/${filename}`
      }
    })

    return NextResponse.json({
      message: 'Logo uploadé avec succès',
      logoPath: updatedCompany.logoPath
    })

  } catch (error) {
    console.error('Erreur upload logo:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'upload du logo' },
      { status: 500 }
    )
  }
}

// Supprimer le logo (super_admin seulement)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getDevSession()
    
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Accès refusé. Seul le super_admin peut gérer les logos.' },
        { status: 403 }
      )
    }

    const { id } = await params
    
    const company = await prisma.company.findUnique({
      where: { id }
    })

    if (!company) {
      return NextResponse.json({ error: 'Société introuvable' }, { status: 404 })
    }

    if (company.logoPath) {
      try {
        const filepath = join(process.cwd(), 'public', company.logoPath)
        await unlink(filepath)
      } catch (error) {
        console.error('Erreur suppression logo:', error)
      }
    }

    await prisma.company.update({
      where: { id },
      data: { logoPath: null }
    })

    return NextResponse.json({ message: 'Logo supprimé avec succès' })

  } catch (error) {
    console.error('Erreur suppression logo:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du logo' },
      { status: 500 }
    )
  }
}
