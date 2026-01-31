"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Upload, Trash2, Building2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"

// Compute a simple dominant color by drawing the image to a small canvas and averaging pixels.
async function extractDominantColor(src: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const w = 40, h = 40
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const data = ctx.getImageData(0, 0, w, h).data
        let r = 0, g = 0, b = 0, count = 0
        for (let i = 0; i < data.length; i += 4) {
          const alpha = data[i+3]
          if (alpha === 0) continue
          r += data[i]
          g += data[i+1]
          b += data[i+2]
          count++
        }
        if (count === 0) return resolve('#000000')
        r = Math.round(r / count)
        g = Math.round(g / count)
        b = Math.round(b / count)
        const toHex = (v: number) => v.toString(16).padStart(2, '0')
        resolve(`#${toHex(r)}${toHex(g)}${toHex(b)}`)
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

interface Company {
  id: string
  name: string
  code: string
  logoPath: string | null
  updatedAt?: string
  primaryColor?: string | null
  primaryColorAuto?: boolean
  accentColor?: string | null
  textColor?: string | null
}

export default function CompaniesManagementPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null)
  const [editingColorFor, setEditingColorFor] = useState<string | null>(null)
  const [colorValues, setColorValues] = useState<Record<string, { primary: string }>>({})

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
        // initialize primary color values
        const initialColors: Record<string, { primary: string }> = {}
        (data || []).forEach((c: any) => {
          initialColors[c.id] = { primary: c.primaryColor || '#000000' }
        })
        setColorValues(initialColors)
      }
    } catch (error) {
      console.error('Erreur chargement sociétés:', error)
      toast({
        title: "Erreur",
        description: "Impossible de charger les sociétés",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogoUpload = async (companyId: string, file: File) => {
    setUploadingLogo(companyId)
    try {
      const formData = new FormData()
      formData.append('logo', file)

      const response = await fetch(`/api/companies/${companyId}/logo`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Logo uploadé avec succès",
        })
        // compute dominant color from uploaded file and set auto mode
        try {
          const objectUrl = URL.createObjectURL(file)
          const dominant = await extractDominantColor(objectUrl)
          URL.revokeObjectURL(objectUrl)
          await fetch(`/api/companies/${companyId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ primaryColor: dominant, primaryColorAuto: true })
          })
        } catch (err) {
          console.error('Erreur calcul couleur auto:', err)
        }
        await loadCompanies()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors de l'upload",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de l'upload du logo",
        variant: "destructive",
      })
    } finally {
      setUploadingLogo(null)
    }
  }

  const handleLogoDelete = async (companyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce logo ?')) return

    try {
      const response = await fetch(`/api/companies/${companyId}/logo`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Succès",
          description: "Logo supprimé avec succès",
        })
        loadCompanies()
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors de la suppression",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Erreur suppression:', error)
      toast({
        title: "Erreur",
        description: "Erreur lors de la suppression du logo",
        variant: "destructive",
      })
    }
  }

  const handleSaveColor = async (companyId: string) => {
    const color = colorValues[companyId]
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primaryColor: color?.primary, primaryColorAuto: false })
      })
      if (res.ok) {
        toast({ title: 'Succès', description: 'Couleur sauvegardée' })
        setEditingColorFor(null)
        loadCompanies()
      } else {
        const data = await res.json()
        toast({ title: 'Erreur', description: data.error || 'Impossible de sauvegarder', variant: 'destructive' })
      }
    } catch (err) {
      console.error('Erreur sauvegarde couleur:', err)
      toast({ title: 'Erreur', description: 'Erreur lors de la sauvegarde', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Gestion des Sociétés</h1>
        <p className="text-muted-foreground">
          Gérez les logos des sociétés qui apparaîtront sur les bons de livraison
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {companies.map((company) => {
          // Add a cache-busting timestamp based on company.updatedAt
          const logoSrc = company.logoPath
            ? `${company.logoPath}?t=${company.updatedAt ? new Date(company.updatedAt).getTime() : Date.now()}`
            : undefined

          return (
          <Card key={company.id}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-lg">{company.name}</CardTitle>
                  <CardDescription>Code: {company.code}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {company.logoPath ? (
                <div className="space-y-3">
                    <div className="relative w-full h-32 bg-muted rounded-lg flex items-center justify-center overflow-hidden border">
                    <Image
                      src={logoSrc || ''}
                      alt={`Logo ${company.name}`}
                      width={200}
                      height={128}
                      className="object-contain"
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={uploadingLogo === company.id}
                    >
                      <label htmlFor={`logo-upload-${company.id}`} className="flex-1 cursor-pointer inline-flex items-center justify-center gap-2">
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLogo === company.id ? 'Upload...' : 'Modifier'}
                      </label>
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleLogoDelete(company.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded border" style={{ background: (colorValues[company.id]?.primary) || (company.primaryColor || '#000000') }} />
                      <Button size="sm" variant="outline" onClick={() => setEditingColorFor(editingColorFor === company.id ? null : company.id)}>
                        Choisir couleur
                      </Button>
                    </div>
                    {editingColorFor === company.id && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <label className="text-xs">Primary</label>
                          <input
                            type="color"
                            value={colorValues[company.id]?.primary || (company.primaryColor || '#000000')}
                            onChange={(e) => setColorValues(prev => ({ ...prev, [company.id]: { ...(prev[company.id] || {}), primary: e.target.value } }))}
                            className="w-10 h-8 p-0"
                          />
                        </div>
                        <Button size="sm" onClick={() => handleSaveColor(company.id)}>Enregistrer</Button>
                      </div>
                    )}
                  <div className="flex items-center gap-2 mt-2">
                    <label className="text-sm">Mode</label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!!company.primaryColorAuto}
                          onChange={async (e) => {
                            const checked = e.target.checked
                            if (checked) {
                              // auto: compute dominant color from logo and save
                              if (!company.logoPath) {
                                toast({ title: 'Erreur', description: 'Aucun logo pour calculer la couleur', variant: 'destructive' })
                                return
                              }
                              try {
                                const res = await fetch(`/api/companies/${company.id}/compute-color`)
                                const json = await res.json()
                                if (!res.ok) throw new Error(json?.error || 'compute failed')
                                const dominant = json.color
                                await fetch(`/api/companies/${company.id}`, {
                                  method: 'PATCH',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ primaryColor: dominant, primaryColorAuto: true })
                                })
                                loadCompanies()
                              } catch (err) {
                                console.error(err)
                                toast({ title: 'Erreur', description: 'Impossible de calculer la couleur', variant: 'destructive' })
                              }
                            } else {
                              // manual mode: just unset auto flag
                              await fetch(`/api/companies/${company.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ primaryColorAuto: false })
                              })
                              loadCompanies()
                            }
                          }}
                        />
                        <span className="text-sm">Auto</span>
                      </label>
                    </div>
                  </div>
                  </div>
                  <Input
                    id={`logo-upload-${company.id}`}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleLogoUpload(company.id, file)
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center border border-dashed">
                    <div className="text-center">
                      <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Aucun logo</p>
                    </div>
                  </div>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={uploadingLogo === company.id}
                  >
                    <label htmlFor={`logo-upload-${company.id}`} className="w-full cursor-pointer inline-flex items-center justify-center gap-2">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLogo === company.id ? 'Upload...' : 'Ajouter un logo'}
                    </label>
                  </Button>
                  <Input
                    id={`logo-upload-${company.id}`}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleLogoUpload(company.id, file)
                      }
                    }}
                  />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Ce logo apparaîtra sur tous les bons de livraison de {company.name}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
