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

export function UserForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [companies, setCompanies] = useState<string[]>(DEFAULT_COMPANIES)
  const [offices, setOffices] = useState<string[]>(DEFAULT_OFFICES)
  const [subscriptions, setSubscriptions] = useState<string[]>(DEFAULT_SUBSCRIPTIONS)
  const [departments, setDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS)
  const [globalEmails, setGlobalEmails] = useState<string[]>(DEFAULT_GLOBAL_EMAILS)
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState("")

  useEffect(() => {
    const savedCompanies = localStorage.getItem("custom_companies")
    const savedOffices = localStorage.getItem("custom_offices")
    const savedSubscriptions = localStorage.getItem("custom_subscriptions")
    const savedDepartments = localStorage.getItem("custom_departments")
    const savedGlobalEmails = localStorage.getItem("custom_global_emails")
    
    if (savedCompanies) setCompanies(JSON.parse(savedCompanies))
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
      role: "viewer",
    },
  })

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          additionalEmails,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || "Erreur lors de la création de l'utilisateur")
        return
      }

      toast.success("Utilisateur créé avec succès")
      router.push("/dashboard/users")
      router.refresh()
    } catch (error) {
      toast.error("Erreur lors de la création de l'utilisateur")
      console.error(error)
    } finally {
      setIsLoading(false)
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
                    setAdditionalEmails([...additionalEmails, newEmail.trim()])
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
                  setAdditionalEmails([...additionalEmails, newEmail.trim()])
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
              {additionalEmails.map((email, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 bg-secondary px-3 py-1 rounded-md text-sm"
                >
                  {email}
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
            <p className="text-xs text-muted-foreground">
              {watch("role") === "super_admin" && "Accès complet à tout le système"}
              {watch("role") === "company_admin" && "Gestion de sa compagnie uniquement"}
              {watch("role") === "viewer" && "Consultation uniquement, pas de modification"}
            </p>
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
                  <SelectItem key={company} value={company}>
                    {company}
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
            <Label htmlFor="office365Subscription">Abonnement Office 365</Label>
            <Select
              onValueChange={(value) => setValue("office365Subscription", value)}
              defaultValue={watch("office365Subscription")}
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
      <div className="flex gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Création..." : "Créer l'utilisateur"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Annuler
        </Button>
      </div>
    </form>
  )
}
