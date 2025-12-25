"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const DEFAULT_COMPANIES = ["Green Tunisie", "Transglory Tunisie", "Seabridge Tunisie", "Globalcontainer", "Unimed Tunisie"]
const DEFAULT_OFFICES = ["Rades", "Sfax", "Sousse", "Charguia"]
const DEFAULT_SUBSCRIPTIONS = ["Microsoft 365 Business Basic", "Microsoft 365 Business Standard", "Microsoft 365 Business Premium", "Office 365 E3", "Office 365 E5"]
const DEFAULT_DEPARTMENTS = ["Documentation", "IT", "Operations", "Sales", "Brokerage", "Finance"]
const DEFAULT_GLOBAL_EMAILS = ["support@greentunisie.com", "sales@greentunisie.com", "accounting@greentunisie.com", "operations@greentunisie.com", "it@greentunisie.com"]

const userSchema = z.object({
  email: z.string().email("Email invalide"),
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  phone: z.string().optional(),
  role: z.enum(["super_admin", "company_admin", "viewer"]),
  company: z.string().min(1, "La société est requise"),
  department: z.string().optional(),
  office: z.string().optional(),
  office365Subscription: z.string().optional(),
  globalEmail: z.string().optional(),
})

type UserFormData = z.infer<typeof userSchema>

interface UserEditFormProps {
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    phone: string | null
    role: string
    company: { id: string; name: string }
    office365Subscription: string | null
    department: string | null
    office: string | null
    globalEmail?: string | null
    userEmails?: Array<{ id: string; email: string }>
  }
}

export function UserEditForm({ user }: UserEditFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; code: string }>>([])
  const [offices, setOffices] = useState<string[]>(DEFAULT_OFFICES)
  const [subscriptions, setSubscriptions] = useState<string[]>(DEFAULT_SUBSCRIPTIONS)
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS)
  const [globalEmails, setGlobalEmails] = useState<string[]>(DEFAULT_GLOBAL_EMAILS)
  const [additionalEmails, setAdditionalEmails] = useState<Array<{ id?: string; email: string }>>(user.userEmails || [])
  const [newEmail, setNewEmail] = useState("")

  useEffect(() => {
    // Charger les sociétés depuis l'API
    fetch('/api/companies')
      .then(res => res.json())
      .then(data => setCompanies(data))
      .catch(err => console.error('Erreur chargement sociétés:', err))

    const savedOffices = localStorage.getItem("custom_offices")
    const savedSubscriptions = localStorage.getItem("custom_subscriptions")
    const savedDepartments = localStorage.getItem("custom_departments")
    const savedGlobalEmails = localStorage.getItem("custom_global_emails")
    
    if (savedOffices) setOffices(JSON.parse(savedOffices))
    if (savedSubscriptions) setSubscriptions(JSON.parse(savedSubscriptions))
    if (savedDepartments) setDepartments(JSON.parse(savedDepartments))
    if (savedGlobalEmails) setGlobalEmails(JSON.parse(savedGlobalEmails))
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || "",
      role: user.role as any,
      company: user.company.name,
      office365Subscription: user.office365Subscription || "",
      department: user.department || "",
      office: user.office || "",
      globalEmail: user.globalEmail || "",
    },
  })

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    try {
      // Trouver l'ID de la société sélectionnée
      const selectedCompany = companies.find(c => c.name === data.company)
      
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          companyId: selectedCompany?.id || user.company.id,
          additionalEmails,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "Erreur lors de la modification de l'utilisateur")
        return
      }

      toast.success("Utilisateur modifié avec succès")
      router.push("/dashboard/users")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la modification de l'utilisateur")
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "Erreur lors de la suppression de l'utilisateur")
        return
      }

      toast.success("Utilisateur supprimé avec succès")
      router.push("/dashboard/users")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la suppression de l'utilisateur")
      console.error(error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Informations personnelles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informations personnelles</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom *</Label>
            <Input
              id="firstName"
              {...register("firstName")}
              placeholder="Jean"
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lastName">Nom *</Label>
            <Input
              id="lastName"
              {...register("lastName")}
              placeholder="Dupont"
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Principal *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="jean.dupont@exemple.fr"
            />
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              {...register("phone")}
              placeholder="+33 6 12 34 56 78"
            />
          </div>
        </div>

        {/* Emails supplémentaires */}
        <div className="space-y-2 md:col-span-2">
          <Label>Emails Supplémentaires</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="email.supplementaire@exemple.fr"
              className="max-w-md"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (newEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                    setAdditionalEmails([...additionalEmails, { email: newEmail.trim() }])
                    setNewEmail("")
                  } else {
                    toast.error("Format d'email invalide")
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="shrink-0"
              onClick={() => {
                if (newEmail.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
                  setAdditionalEmails([...additionalEmails, { email: newEmail.trim() }])
                  setNewEmail("")
                } else {
                  toast.error("Format d'email invalide")
                }
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {additionalEmails.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {additionalEmails.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-md text-sm"
                >
                  {item.email}
                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalEmails(additionalEmails.filter((_, i) => i !== index))
                    }}
                    className="hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rôle et permissions */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Rôle et permissions</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="role">Rôle *</Label>
            <Select
              onValueChange={(value: string) => setValue("role", value as any)}
              defaultValue={watch("role")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="super_admin">Super Administrateur</SelectItem>
                <SelectItem value="company_admin">Administrateur Compagnie</SelectItem>
                <SelectItem value="viewer">Lecteur</SelectItem>
              </SelectContent>
            </Select>
            {errors.role && (
              <p className="text-sm text-red-500">{errors.role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="office365">Abonnement Office 365</Label>
            <Select
              onValueChange={(value: string) => setValue("office365Subscription", value)}
              defaultValue={watch("office365Subscription") || ""}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un abonnement" />
              </SelectTrigger>
              <SelectContent>
                {subscriptions.map((subscription) => (
                  <SelectItem key={subscription} value={subscription}>{subscription}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Informations professionnelles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Informations professionnelles</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">Société *</Label>
            <Select
              onValueChange={(value) => setValue("company", value)}
              defaultValue={watch("company")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner une société" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.name}>
                    {company.name} ({company.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.company && (
              <p className="text-sm text-red-500">{errors.company.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Département</Label>
            <Select
              onValueChange={(value) => setValue("department", value)}
              defaultValue={watch("department")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un département" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="office">Bureau</Label>
            <Select
              onValueChange={(value) => setValue("office", value)}
              defaultValue={watch("office")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un bureau" />
              </SelectTrigger>
              <SelectContent>
                {offices.map((office) => (
                  <SelectItem key={office} value={office}>{office}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="globalEmail">Email Global</Label>
            <Select
              onValueChange={(value) => setValue("globalEmail", value)}
              defaultValue={watch("globalEmail")}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un email global" />
              </SelectTrigger>
              <SelectContent>
                {globalEmails.map((email) => (
                  <SelectItem key={email} value={email}>{email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="destructive" disabled={isDeleting}>
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isLoading}
          >
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>
    </form>
  )
}
