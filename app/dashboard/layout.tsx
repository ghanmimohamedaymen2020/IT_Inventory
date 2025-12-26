import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Button } from "@/components/ui/button"
import { NavItem } from "@/components/layout/nav-item"
import { 
  LayoutDashboard, 
  Laptop, 
  Users, 
  Package, 
  ClipboardList, 
  AppWindow,
  Settings,
  LogOut,
  Monitor,
  PackageOpen,
  FileText,
  ChevronDown
} from "lucide-react"
import { signOut } from "@/lib/auth"
import { cookies } from "next/headers"
import { jwtVerify } from "jose"

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
        name: payload.email as string,
        role: payload.role as string,
        companyId: payload.companyId as string,
        company: payload.company as any,
      }
    }
  } catch (error) {
    return null
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Essayer d'abord la session de développement
  let session = await getDevSession()
  
  // Sinon, essayer NextAuth
  if (!session) {
    const authSession = await auth()
    if (authSession?.user) {
      session = {
        user: {
          id: authSession.user.id || '',
          email: authSession.user.email || '',
          name: authSession.user.name || '',
          role: (authSession.user as any).role || 'viewer',
          companyId: (authSession.user as any).companyId || '',
          company: (authSession.user as any).company || null
        }
      }
    }
  }

  if (!session?.user) {
    redirect("/auth/login")
  }

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { name: "Machines", href: "/dashboard/machines", icon: "Laptop" },
    { name: "Écrans", href: "/dashboard/screens", icon: "Monitor" },
    { name: "Utilisateurs", href: "/dashboard/users", icon: "Users" },
    { name: "Consommables", href: "/dashboard/consumables", icon: "Package" },
    { 
      name: "Documents", 
      icon: "FileText",
      subItems: [
        { name: "Bons de livraison", href: "/dashboard/delivery-notes", icon: "Package" },
        { name: "Bons de retour", href: "/dashboard/return-notes", icon: "PackageOpen" },
      ]
    },
    { name: "Installations", href: "/dashboard/installation", icon: "ClipboardList" },
    { name: "Logiciels", href: "/dashboard/software", icon: "AppWindow" },
    { name: "Interventions", href: "/dashboard/interventions", icon: "FileText" },
  ]

  // Ajouter l'admin pour les rôles appropriés
  if (session.user.role === 'super_admin' || session.user.role === 'company_admin') {
    navigation.push({ name: "Administration", href: "/dashboard/admin", icon: "Settings" })
  }

  // Ajouter les paramètres système pour super_admin uniquement
  if (session.user.role === 'super_admin') {
    navigation.push({ name: "Paramètres", href: "/dashboard/admin/settings", icon: "Settings" })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center h-16 px-6 border-b">
            <h1 className="text-xl font-bold">IT Inventory</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavItem
                key={item.name}
                name={item.name}
                href={item.href}
                icon={item.icon}
                subItems={item.subItems}
              />
            ))}
          </nav>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {session.user.name || session.user.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {session.user.company?.name}
                </p>
              </div>
            </div>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/auth/login" })
              }}
            >
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                size="sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="pl-64">
        <div className="container mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
