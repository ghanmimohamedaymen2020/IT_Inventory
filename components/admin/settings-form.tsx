"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

const DEFAULTS = {
  companies: ["Green Tunisie", "Transglory Tunisie", "Seabridge Tunisie", "Globalcontainer", "Unimed Tunisie"],
  offices: ["Rades", "Sfax", "Sousse", "Charguia"],
  subscriptions: ["Microsoft 365 Business Basic", "Microsoft 365 Business Standard", "Microsoft 365 Business Premium", "Office 365 E3", "Office 365 E5"],
  departments: ["Documentation", "IT", "Operations", "Sales", "Brokerage", "Finance"],
  emails: ["support@greentunisie.com", "sales@greentunisie.com", "accounting@greentunisie.com", "operations@greentunisie.com", "it@greentunisie.com"],
  machineTypes: ["Laptop", "Desktop", "Server", "Tablet"],
  os: ["Windows 11 Pro", "Windows 10 Pro", "Windows 11 Home", "Ubuntu 22.04", "Ubuntu 20.04", "macOS Ventura"],
  softwares: ['MS Office 2016', 'MS Teams', 'Antivirus (Sentinel)', 'Cisco AnyConnect', 'TeamViewer', 'Zoom', 'Chrome']
}

interface Company {
  id: string
  name: string
  code: string
  logoPath: string | null
}

type ListType = 'offices' | 'subscriptions' | 'departments' | 'emails' | 'machineTypes' | 'softwares'

export function SettingsForm() {
  // États
  const [companies, setCompanies] = useState<Company[]>([])
  const [operatingSystems, setOperatingSystems] = useState<string[]>([])
  const [newOs, setNewOs] = useState("")
  const [newCompany, setNewCompany] = useState({ name: "", code: "" })
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // États pour les listes simples
  const [lists, setLists] = useState<Record<ListType, string[]>>({
    offices: [],
    subscriptions: [],
    departments: [],
    emails: [],
    machineTypes: [],
    softwares: []
  })
  const [newItems, setNewItems] = useState<Record<ListType, string>>({
    offices: "",
    subscriptions: "",
    departments: "",
    emails: "",
    machineTypes: "",
    softwares: ""
  })

  // Initialisation
  useEffect(() => {
    loadCompanies()
    loadOS()
    
    Object.keys(lists).forEach(key => {
      const type = key as ListType
      const saved = localStorage.getItem(`custom_${type}`)
      setLists(prev => ({
        ...prev,
        [type]: saved ? JSON.parse(saved) : DEFAULTS[type] || []
      }))
    })
  }, [])

  // Chargement données
  const loadCompanies = async () => {
    try {
      const res = await fetch('/api/companies')
      if (res.ok) setCompanies(await res.json())
    } catch (error) {
      toast.error("Erreur chargement sociétés")
    } finally {
      setLoading(false)
    }
  }

  const loadOS = async () => {
    try {
      const res = await fetch('/api/os')
      setOperatingSystems(res.ok ? (await res.json()).map((o: any) => o.name) : DEFAULTS.os)
    } catch {
      setOperatingSystems(DEFAULTS.os)
    }
  }

  // Gestion liste générique
  const updateList = (type: ListType, items: string[]) => {
    setLists(prev => ({ ...prev, [type]: items }))
    localStorage.setItem(`custom_${type}`, JSON.stringify(items))
  }

  const addToList = (type: ListType) => {
    const value = newItems[type].trim()
    if (!value) {
      toast.error(`Veuillez entrer un ${getLabel(type)}`)
      return
    }

    if (lists[type].includes(value)) {
      toast.error(`${getLabel(type)} existe déjà`)
      return
    }

    if (type === 'emails' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Format d'email invalide")
      return
    }

    updateList(type, [...lists[type], value])
    setNewItems(prev => ({ ...prev, [type]: "" }))
    toast.success(`${getLabel(type)} ajouté`)
  }

  const removeFromList = (type: ListType, item: string) => {
    updateList(type, lists[type].filter(i => i !== item))
    toast.success(`${getLabel(type)} supprimé`)
  }

  // Sociétés
  const addCompany = async () => {
    if (!newCompany.name.trim()) {
      toast.error("Nom société requis")
      return
    }

    const code = newCompany.code.trim() || generateCode(newCompany.name)
    
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCompany.name.trim(), code })
      })

      if (res.ok) {
        await loadCompanies()
        setNewCompany({ name: "", code: "" })
        toast.success("Société ajoutée")
      } else {
        toast.error((await res.json()).error || "Erreur ajout")
      }
    } catch {
      toast.error("Erreur ajout société")
    }
  }

  const removeCompany = async (id: string) => {
    if (!confirm('Supprimer cette société ?')) return
    try {
      const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' })
      if (res.ok) {
        await loadCompanies()
        toast.success("Société supprimée")
      }
    } catch {
      toast.error("Erreur suppression")
    }
  }

  // Logos
  const handleLogoUpload = async (companyId: string, file: File) => {
    setUploadingLogo(companyId)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('companyId', companyId)

      const res = await fetch('/api/society-logos', { method: 'POST', body: formData })
      if (res.ok) {
        await loadCompanies()
        toast.success("Logo uploadé")
      }
    } catch {
      toast.error("Erreur upload")
    } finally {
      setUploadingLogo(null)
    }
  }

  const handleLogoDelete = async (companyId: string) => {
    if (!confirm('Supprimer ce logo ?')) return
    try {
      const res = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoPath: null })
      })
      if (res.ok) {
        await loadCompanies()
        toast.success("Logo supprimé")
      }
    } catch {
      toast.error("Erreur suppression logo")
    }
  }

  // OS
  const addOs = async () => {
    if (!newOs.trim()) {
      toast.error("OS requis")
      return
    }

    try {
      const res = await fetch('/api/os', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newOs.trim() })
      })

      if (res.ok) {
        setOperatingSystems(prev => [...prev, newOs.trim()])
        setNewOs("")
        toast.success('OS ajouté')
      }
    } catch {
      toast.error('Erreur ajout OS')
    }
  }

  const removeOs = async (name: string) => {
    if (!confirm(`Supprimer ${name} ?`)) return
    try {
      const listRes = await fetch('/api/os')
      const list = await listRes.json()
      const os = list.find((o: any) => o.name === name)
      
      if (os) {
        await fetch(`/api/os/${os.id}`, { method: 'DELETE' })
        setOperatingSystems(prev => prev.filter(o => o !== name))
        toast.success('OS supprimé')
      }
    } catch {
      toast.error('Erreur suppression OS')
    }
  }

  // Reset
  const resetToDefaults = () => {
    Object.keys(DEFAULTS).forEach(key => {
      const type = key as ListType
      if (type in DEFAULTS) {
        updateList(type, DEFAULTS[type] as string[])
      }
    })
    toast.success("Listes réinitialisées")
  }

  // Composants réutilisables
  const EditableList = ({ type, label }: { type: ListType, label: string }) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">{label}</Label>
        <Badge variant="secondary">{lists[type].length}</Badge>
      </div>

      <div className="flex gap-2">
        <Input
          value={newItems[type]}
          onChange={e => setNewItems(prev => ({ ...prev, [type]: e.target.value }))}
          placeholder={`Nouveau ${label.toLowerCase()}...`}
          onKeyPress={e => e.key === 'Enter' && addToList(type)}
        />
        <Button onClick={() => addToList(type)} size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {lists[type].map(item => (
          <Badge key={item} variant="outline" className="px-3 py-1.5 text-sm">
            {item}
            <button
              onClick={() => removeFromList(type, item)}
              className="ml-2 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Sociétés */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Sociétés</Label>
          <Badge variant="secondary">{companies.length} société(s)</Badge>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <Input
            value={newCompany.name}
            onChange={e => setNewCompany(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nom de la société..."
            onKeyPress={e => e.key === 'Enter' && addCompany()}
          />
          <div className="flex gap-2">
            <Input
              value={newCompany.code}
              onChange={e => setNewCompany(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="Code (ex: GREEN)"
              maxLength={10}
              onKeyPress={e => e.key === 'Enter' && addCompany()}
            />
            <Button onClick={addCompany} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground">Chargement...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {companies.map(company => (
              <CompanyCard
                key={company.id}
                company={company}
                uploadingLogo={uploadingLogo}
                onLogoUpload={handleLogoUpload}
                onLogoDelete={handleLogoDelete}
                onRemove={() => removeCompany(company.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Listes éditable */}
      {/* Les listes Bureaux et Départements ont été déplacées hors de la page Paramètres. */}

      {/* OS and other lists moved to the relevant pages. */}

      {/* Reset */}
      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={resetToDefaults}>
          Réinitialiser aux valeurs par défaut
        </Button>
      </div>
    </div>
  )
}

// Composants enfants
function CompanyCard({ 
  company, 
  uploadingLogo, 
  onLogoUpload, 
  onLogoDelete, 
  onRemove 
}: { 
  company: Company
  uploadingLogo: string | null
  onLogoUpload: (id: string, file: File) => void
  onLogoDelete: (id: string) => void
  onRemove: () => void
}) {
  const fileInputId = `logo-${company.id}`

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium">{company.name}</span>
          <Badge variant="outline" className="ml-2 text-xs">{company.code}</Badge>
        </div>
        <button onClick={onRemove} className="text-muted-foreground hover:text-destructive">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <div className="relative w-full h-24 bg-muted rounded flex items-center justify-center overflow-hidden border">
          {company.logoPath ? (
            <Image
              src={company.logoPath}
              alt={`Logo ${company.name}`}
              width={150}
              height={96}
              className="object-contain"
            />
          ) : (
            <div className="text-center">
              <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Aucun logo</p>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Label htmlFor={fileInputId} className="flex-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              disabled={uploadingLogo === company.id}
            >
              <Upload className="h-3 w-3 mr-2" />
              {uploadingLogo === company.id ? 'Upload...' : company.logoPath ? 'Modifier' : 'Ajouter logo'}
            </Button>
          </Label>
          
          {company.logoPath && (
            <Button type="button" variant="destructive" size="sm" onClick={() => onLogoDelete(company.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Input
          id={fileInputId}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onLogoUpload(company.id, file)
          }}
        />
      </div>
    </div>
  )
}

// Utilitaires
function generateCode(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 ]/g, '').trim()
  if (!cleaned) return 'CMP'
  const parts = cleaned.split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 4).toUpperCase()
  return (parts[0].substring(0, 2) + parts[1].substring(0, 2)).toUpperCase()
}

function getLabel(type: ListType): string {
  const labels: Record<ListType, string> = {
    offices: 'bureau',
    subscriptions: 'abonnement',
    departments: 'département',
    emails: 'email',
    machineTypes: 'type de machine',
    softwares: 'logiciel'
  }
  return labels[type]
}