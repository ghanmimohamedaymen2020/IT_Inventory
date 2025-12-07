"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Upload, Trash2, Building2, Image as ImageIcon } from "lucide-react"
import Image from "next/image"

interface Company {
  id: string
  name: string
  code: string
  logoPath: string | null
}

export default function CompaniesManagementPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null)

  useEffect(() => {
    loadCompanies()
  }, [])

  const loadCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      if (response.ok) {
        const data = await response.json()
        setCompanies(data)
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
        loadCompanies()
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
        {companies.map((company) => (
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
                      src={company.logoPath}
                      alt={`Logo ${company.name}`}
                      width={200}
                      height={128}
                      className="object-contain"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Label
                      htmlFor={`logo-upload-${company.id}`}
                      className="flex-1"
                    >
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploadingLogo === company.id}
                        onClick={() => {
                          document.getElementById(`logo-upload-${company.id}`)?.click()
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingLogo === company.id ? 'Upload...' : 'Modifier'}
                      </Button>
                    </Label>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleLogoDelete(company.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Input
                    id={`logo-upload-${company.id}`}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
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
                  <Label htmlFor={`logo-upload-${company.id}`} className="w-full">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={uploadingLogo === company.id}
                      onClick={() => {
                        document.getElementById(`logo-upload-${company.id}`)?.click()
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingLogo === company.id ? 'Upload...' : 'Ajouter un logo'}
                    </Button>
                  </Label>
                  <Input
                    id={`logo-upload-${company.id}`}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
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
