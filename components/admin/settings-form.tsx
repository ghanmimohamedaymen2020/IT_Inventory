"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Trash2, Upload, Image as ImageIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import Image from "next/image"

const DEFAULT_COMPANIES = ["Green Tunisie", "Transglory Tunisie", "Seabridge Tunisie", "Globalcontainer", "Unimed Tunisie"]
const DEFAULT_OFFICES = ["Rades", "Sfax", "Sousse", "Charguia"]
const DEFAULT_SUBSCRIPTIONS = ["Microsoft 365 Business Basic", "Microsoft 365 Business Standard", "Microsoft 365 Business Premium", "Office 365 E3", "Office 365 E5"]
const DEFAULT_DEPARTMENTS = ["Documentation", "IT", "Operations", "Sales", "Brokerage", "Finance"]
const DEFAULT_GLOBAL_EMAILS = ["support@greentunisie.com", "sales@greentunisie.com", "accounting@greentunisie.com", "operations@greentunisie.com", "it@greentunisie.com"]
const DEFAULT_MACHINE_TYPES = ["Laptop", "Desktop", "Server", "Tablet"]

interface CompanyWithLogo {
  id: string
  name: string
  code: string
  logoPath: string | null
}

export function SettingsForm() {
  const [companies, setCompanies] = useState<CompanyWithLogo[]>([])
  const [offices, setOffices] = useState<string[]>([])
  const [subscriptions, setSubscriptions] = useState<string[]>([])
  const [departments, setDepartments] = useState<string[]>([])
  const [globalEmails, setGlobalEmails] = useState<string[]>([])
  const [machineTypes, setMachineTypes] = useState<string[]>([])
  const [newCompany, setNewCompany] = useState("")
  const [newCompanyCode, setNewCompanyCode] = useState("")
  const [newOffice, setNewOffice] = useState("")
  const [newSubscription, setNewSubscription] = useState("")
  const [newDepartment, setNewDepartment] = useState("")
  const [newGlobalEmail, setNewGlobalEmail] = useState("")
  const [newMachineType, setNewMachineType] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Charger les sociétés depuis l'API
    loadCompanies()
    
    // Charger les autres listes depuis localStorage
    const savedOffices = localStorage.getItem("custom_offices")
    const savedSubscriptions = localStorage.getItem("custom_subscriptions")
    const savedDepartments = localStorage.getItem("custom_departments")
    const savedGlobalEmails = localStorage.getItem("custom_global_emails")
    const savedMachineTypes = localStorage.getItem("custom_machine_types")
    
    setOffices(savedOffices ? JSON.parse(savedOffices) : DEFAULT_OFFICES)
    setSubscriptions(savedSubscriptions ? JSON.parse(savedSubscriptions) : DEFAULT_SUBSCRIPTIONS)
    setDepartments(savedDepartments ? JSON.parse(savedDepartments) : DEFAULT_DEPARTMENTS)
    setGlobalEmails(savedGlobalEmails ? JSON.parse(savedGlobalEmails) : DEFAULT_GLOBAL_EMAILS)
    setMachineTypes(savedMachineTypes ? JSON.parse(savedMachineTypes) : DEFAULT_MACHINE_TYPES)
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
      toast.error("Erreur lors du chargement des sociétés")
    } finally {
      setLoading(false)
    }
  }

  const saveToStorage = (type: 'offices' | 'subscriptions' | 'departments' | 'globalEmails' | 'machineTypes', data: string[]) => {
    if (type === 'subscriptions') {
      localStorage.setItem('custom_subscriptions', JSON.stringify(data))
    } else if (type === 'departments') {
      localStorage.setItem('custom_departments', JSON.stringify(data))
    } else if (type === 'globalEmails') {
      localStorage.setItem('custom_global_emails', JSON.stringify(data))
    } else if (type === 'machineTypes') {
      localStorage.setItem('custom_machine_types', JSON.stringify(data))
    } else {
      localStorage.setItem('custom_offices', JSON.stringify(data))
    }
  }

  const addCompany = async () => {
    if (!newCompany.trim()) {
      toast.error("Veuillez entrer un nom de société")
      return
    }
    
    if (!newCompanyCode.trim()) {
      toast.error("Veuillez entrer un code de société")
      return
    }
    
    if (companies.some(c => c.name === newCompany.trim())) {
      toast.error("Cette société existe déjà")
      return
    }

    if (companies.some(c => c.code === newCompanyCode.trim().toUpperCase())) {
      toast.error("Ce code de société existe déjà")
      return
    }

    try {
      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompany.trim(),
          code: newCompanyCode.trim().toUpperCase()
        })
      })

      if (response.ok) {
        await loadCompanies()
        setNewCompany("")
        setNewCompanyCode("")
        toast.success("Société ajoutée")
      } else {
        const data = await response.json()
        toast.error(data.error || "Erreur lors de l'ajout")
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Erreur lors de l'ajout de la société")
    }
  }

  const removeCompany = async (companyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette société ?')) return

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadCompanies()
        toast.success("Société supprimée")
      } else {
        const data = await response.json()
        toast.error(data.error || "Erreur lors de la suppression")
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Erreur lors de la suppression de la société")
    }
  }

  const handleLogoUpload = async (companyId: string, file: File) => {
    setUploadingLogo(companyId)
    try {
      const formData = new FormData()
      formData.append('logo', file)
      formData.append('companyId', companyId)

      const response = await fetch(`/api/society-logos`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (response.ok) {
        await loadCompanies()
        toast.success("Logo uploadé avec succès")
      } else {
        toast.error(data.error || "Erreur lors de l'upload")
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      toast.error("Erreur lors de l'upload du logo")
    } finally {
      setUploadingLogo(null)
    }
  }

  const handleLogoDelete = async (companyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce logo ?')) return

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logoPath: null })
      })

      if (response.ok) {
        await loadCompanies()
        toast.success("Logo supprimé")
      } else {
        toast.error("Erreur lors de la suppression du logo")
      }
    } catch (error) {
      console.error('Erreur:', error)
      toast.error("Erreur lors de la suppression du logo")
    }
  }

  const addOffice = () => {
    if (!newOffice.trim()) {
      toast.error("Veuillez entrer un nom de bureau")
      return
    }
    
    if (offices.includes(newOffice.trim())) {
      toast.error("Ce bureau existe déjà")
      return
    }

    const updated = [...offices, newOffice.trim()]
    setOffices(updated)
    saveToStorage('offices', updated)
    setNewOffice("")
    toast.success("Bureau ajouté")
  }

  const removeOffice = (office: string) => {
    const updated = offices.filter(o => o !== office)
    setOffices(updated)
    saveToStorage('offices', updated)
    toast.success("Bureau supprimé")
  }

  const addSubscription = () => {
    if (!newSubscription.trim()) {
      toast.error("Veuillez entrer un nom d'abonnement")
      return
    }
    
    if (subscriptions.includes(newSubscription.trim())) {
      toast.error("Cet abonnement existe déjà")
      return
    }

    const updated = [...subscriptions, newSubscription.trim()]
    setSubscriptions(updated)
    saveToStorage('subscriptions', updated)
    setNewSubscription("")
    toast.success("Abonnement ajouté")
  }

  const removeSubscription = (subscription: string) => {
    const updated = subscriptions.filter(s => s !== subscription)
    setSubscriptions(updated)
    saveToStorage('subscriptions', updated)
    toast.success("Abonnement supprimé")
  }

  const addDepartment = () => {
    if (!newDepartment.trim()) {
      toast.error("Veuillez entrer un nom de département")
      return
    }
    
    if (departments.includes(newDepartment.trim())) {
      toast.error("Ce département existe déjà")
      return
    }

    const updated = [...departments, newDepartment.trim()]
    setDepartments(updated)
    saveToStorage('departments', updated)
    setNewDepartment("")
    toast.success("Département ajouté")
  }

  const removeDepartment = (department: string) => {
    const updated = departments.filter(d => d !== department)
    setDepartments(updated)
    saveToStorage('departments', updated)
    toast.success("Département supprimé")
  }

  const addGlobalEmail = () => {
    if (!newGlobalEmail.trim()) {
      toast.error("Veuillez entrer un email global")
      return
    }
    
    // Validation basique de l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newGlobalEmail.trim())) {
      toast.error("Format d'email invalide")
      return
    }
    
    if (globalEmails.includes(newGlobalEmail.trim())) {
      toast.error("Cet email existe déjà")
      return
    }

    const updated = [...globalEmails, newGlobalEmail.trim()]
    setGlobalEmails(updated)
    saveToStorage('globalEmails', updated)
    setNewGlobalEmail("")
    toast.success("Émail global ajouté")
  }

  const removeGlobalEmail = (email: string) => {
    const updated = globalEmails.filter(e => e !== email)
    setGlobalEmails(updated)
    saveToStorage('globalEmails', updated)
    toast.success("Émail global supprimé")
  }

  const addMachineType = () => {
    if (!newMachineType.trim()) {
      toast.error("Veuillez entrer un type de machine")
      return
    }
    
    if (machineTypes.includes(newMachineType.trim())) {
      toast.error("Ce type de machine existe déjà")
      return
    }

    const updated = [...machineTypes, newMachineType.trim()]
    setMachineTypes(updated)
    saveToStorage('machineTypes', updated)
    setNewMachineType("")
    toast.success("Type de machine ajouté")
  }

  const removeMachineType = (machineType: string) => {
    const updated = machineTypes.filter(t => t !== machineType)
    setMachineTypes(updated)
    saveToStorage('machineTypes', updated)
    toast.success("Type de machine supprimé")
  }

  const resetToDefaults = () => {
    setOffices(DEFAULT_OFFICES)
    setSubscriptions(DEFAULT_SUBSCRIPTIONS)
    setDepartments(DEFAULT_DEPARTMENTS)
    setGlobalEmails(DEFAULT_GLOBAL_EMAILS)
    setMachineTypes(DEFAULT_MACHINE_TYPES)
    saveToStorage('offices', DEFAULT_OFFICES)
    saveToStorage('subscriptions', DEFAULT_SUBSCRIPTIONS)
    saveToStorage('departments', DEFAULT_DEPARTMENTS)
    saveToStorage('globalEmails', DEFAULT_GLOBAL_EMAILS)
    saveToStorage('machineTypes', DEFAULT_MACHINE_TYPES)
    toast.success("Listes réinitialisées aux valeurs par défaut (sauf sociétés)")
  }

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
            value={newCompany}
            onChange={(e) => setNewCompany(e.target.value)}
            placeholder="Nom de la société..."
            onKeyPress={(e) => e.key === 'Enter' && addCompany()}
          />
          <div className="flex gap-2">
            <Input
              value={newCompanyCode}
              onChange={(e) => setNewCompanyCode(e.target.value.toUpperCase())}
              placeholder="Code (ex: GREEN)"
              maxLength={10}
              onKeyPress={(e) => e.key === 'Enter' && addCompany()}
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
            {companies.map((company) => (
              <div key={company.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{company.name}</span>
                    <Badge variant="outline" className="ml-2 text-xs">{company.code}</Badge>
                  </div>
                  <button
                    onClick={() => removeCompany(company.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {company.logoPath ? (
                  <div className="space-y-2">
                    <div className="relative w-full h-24 bg-muted rounded flex items-center justify-center overflow-hidden border">
                      <Image
                        src={company.logoPath}
                        alt={`Logo ${company.name}`}
                        width={150}
                        height={96}
                        className="object-contain"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Label htmlFor={`logo-${company.id}`} className="flex-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={uploadingLogo === company.id}
                          onClick={() => document.getElementById(`logo-${company.id}`)?.click()}
                        >
                          <Upload className="h-3 w-3 mr-2" />
                          {uploadingLogo === company.id ? 'Upload...' : 'Modifier'}
                        </Button>
                      </Label>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleLogoDelete(company.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    <Input
                      id={`logo-${company.id}`}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(company.id, file)
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full h-24 bg-muted rounded flex items-center justify-center border border-dashed">
                      <div className="text-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground mx-auto mb-1" />
                        <p className="text-xs text-muted-foreground">Aucun logo</p>
                      </div>
                    </div>
                    <Label htmlFor={`logo-${company.id}`} className="w-full">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={uploadingLogo === company.id}
                        onClick={() => document.getElementById(`logo-${company.id}`)?.click()}
                      >
                        <Upload className="h-3 w-3 mr-2" />
                        {uploadingLogo === company.id ? 'Upload...' : 'Ajouter logo'}
                      </Button>
                    </Label>
                    <Input
                      id={`logo-${company.id}`}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) handleLogoUpload(company.id, file)
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bureaux */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Bureaux</Label>
          <Badge variant="secondary">{offices.length} bureau(x)</Badge>
        </div>

        <div className="flex gap-2">
          <Input
            value={newOffice}
            onChange={(e) => setNewOffice(e.target.value)}
            placeholder="Nouveau bureau..."
            onKeyPress={(e) => e.key === 'Enter' && addOffice()}
          />
          <Button onClick={addOffice} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {offices.map((office) => (
            <Badge key={office} variant="outline" className="px-3 py-1.5 text-sm">
              {office}
              <button
                onClick={() => removeOffice(office)}
                className="ml-2 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Abonnements Office 365 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Abonnements Office 365</Label>
          <Badge variant="secondary">{subscriptions.length} abonnement(s)</Badge>
        </div>

        <div className="flex gap-2">
          <Input
            value={newSubscription}
            onChange={(e) => setNewSubscription(e.target.value)}
            placeholder="Nouvel abonnement..."
            onKeyPress={(e) => e.key === 'Enter' && addSubscription()}
          />
          <Button onClick={addSubscription} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {subscriptions.map((subscription) => (
            <Badge key={subscription} variant="outline" className="px-3 py-1.5 text-sm">
              {subscription}
              <button
                onClick={() => removeSubscription(subscription)}
                className="ml-2 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Départements */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Départements</Label>
          <Badge variant="secondary">{departments.length} département(s)</Badge>
        </div>

        <div className="flex gap-2">
          <Input
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
            placeholder="Nouveau département..."
            onKeyPress={(e) => e.key === 'Enter' && addDepartment()}
          />
          <Button onClick={addDepartment} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {departments.map((department) => (
            <Badge key={department} variant="outline" className="px-3 py-1.5 text-sm">
              {department}
              <button
                onClick={() => removeDepartment(department)}
                className="ml-2 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Emails Globaux */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Emails Globaux</Label>
          <Badge variant="secondary">{globalEmails.length} email(s)</Badge>
        </div>

        <div className="flex gap-2">
          <Input
            type="email"
            value={newGlobalEmail}
            onChange={(e) => setNewGlobalEmail(e.target.value)}
            placeholder="nouvel-email@exemple.com"
            onKeyPress={(e) => e.key === 'Enter' && addGlobalEmail()}
          />
          <Button onClick={addGlobalEmail} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {globalEmails.map((email) => (
            <Badge key={email} variant="outline" className="px-3 py-1.5 text-sm">
              {email}
              <button
                onClick={() => removeGlobalEmail(email)}
                className="ml-2 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Types de Machines */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-lg font-semibold">Types de Machines</Label>
          <Badge variant="secondary">{machineTypes.length} type(s)</Badge>
        </div>

        <div className="flex gap-2">
          <Input
            value={newMachineType}
            onChange={(e) => setNewMachineType(e.target.value)}
            placeholder="Nouveau type de machine..."
            onKeyPress={(e) => e.key === 'Enter' && addMachineType()}
          />
          <Button onClick={addMachineType} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {machineTypes.map((machineType) => (
            <Badge key={machineType} variant="outline" className="px-3 py-1.5 text-sm">
              {machineType}
              <button
                onClick={() => removeMachineType(machineType)}
                className="ml-2 hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button variant="outline" onClick={resetToDefaults}>
          Réinitialiser aux valeurs par défaut
        </Button>
      </div>
    </div>
  )
}
