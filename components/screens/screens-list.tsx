"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface Screen {
  id: string
  brand: string
  serialNumber: string
  inventoryCode: string
  model: string | null
  size: string | null
  resolution: string | null
  purchaseDate: string | null
  warrantyDate: string | null
  machine: {
    machineName: string
    inventoryCode: string
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
    } | null
  } | null
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

export function ScreensList() {
  const router = useRouter()
  const [screens, setScreens] = useState<Screen[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchScreens()
  }, [])

  const fetchScreens = async () => {
    try {
      const response = await fetch("/api/screens")
      if (response.ok) {
        const data = await response.json()
        setScreens(data.screens || [])
      }
    } catch (error) {
      console.error("Erreur lors du chargement des écrans:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <div className="text-center py-8">Chargement...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => router.push("/dashboard/screens/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un écran
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[110px]">Code</TableHead>
              <TableHead className="w-[100px]">Marque</TableHead>
              <TableHead className="w-[100px]">Modèle</TableHead>
              <TableHead className="w-[80px]">Taille</TableHead>
              <TableHead className="w-[100px]">Résolution</TableHead>
              <TableHead className="w-[120px]">N° Série</TableHead>
              <TableHead className="w-[100px]">Achat</TableHead>
              <TableHead className="w-[100px]">Garantie</TableHead>
              <TableHead className="w-[150px]">Machine</TableHead>
              <TableHead className="w-[200px]">Utilisateur</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {screens.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center text-muted-foreground">
                  Aucun écran trouvé
                </TableCell>
              </TableRow>
            ) : (
              screens.map((screen) => (
                <TableRow key={screen.id}>
                  <TableCell className="font-mono text-xs">
                    {screen.inventoryCode}
                  </TableCell>
                  <TableCell className="text-sm">{screen.brand}</TableCell>
                  <TableCell className="text-sm">{screen.model || "-"}</TableCell>
                  <TableCell className="text-center">
                    {screen.size ? (
                      <Badge variant="secondary" className="text-xs">{screen.size}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {screen.resolution ? (
                      <Badge variant="outline" className="text-xs">{screen.resolution}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {screen.serialNumber}
                  </TableCell>
                  <TableCell className="text-xs">
                    {screen.purchaseDate 
                      ? new Date(screen.purchaseDate).toLocaleDateString('fr-FR')
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {screen.warrantyDate 
                      ? new Date(screen.warrantyDate).toLocaleDateString('fr-FR')
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {screen.machine ? (
                      <div className="text-xs">
                        <div className="font-medium">{screen.machine.machineName}</div>
                        <div className="text-muted-foreground">{screen.machine.inventoryCode}</div>
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {screen.user || screen.machine?.user ? (
                      <div className="text-xs">
                        <div className="font-medium">
                          {screen.user ? 
                            `${screen.user.firstName} ${screen.user.lastName}` : 
                            `${screen.machine?.user?.firstName} ${screen.machine?.user?.lastName}`
                          }
                        </div>
                        <div className="text-muted-foreground truncate max-w-[180px]">
                          {screen.user?.email || screen.machine?.user?.email}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Non assigné
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/screens/${screen.id}`)}
                    >
                      Modifier
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
