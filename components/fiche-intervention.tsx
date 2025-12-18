"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

// PDF is generated server-side to ensure company logo is embedded correctly

type Machine = {
  id: string
  inventoryCode: string
  machineName: string | null
  type: string
  vendor: string
  model: string | null
  serialNumber: string
}

export default function FicheIntervention() {
  // ...hooks useState/useEffect...
  // (déjà présents plus haut)

  // ...hooks useState/useEffect...
  // (déjà présents plus bas)

  // ...hooks useState/useEffect...
  // (déjà présents plus bas)

  // Logo dynamique de la société sélectionnée (doit être après tous les hooks)
  // Use an existing image from public/logos as default to avoid 404 on /logo.png
  let selectedUser = undefined
  // existing default logo in public/logos — replaces missing /logo.png
  let logoUrl = "/logos/green-1765139730896.png"
  try {
    selectedUser = users.find(u => u.id === selectedUserId)
    logoUrl = selectedUser?.company?.logoPath || selectedUser?.company?.logo || "/logos/green-1765139730896.png"
  } catch (e) {
    // fallback kept to the logos default
    logoUrl = "/logos/green-1765139730896.png"
  }
  const [softwares, setSoftwares] = useState<string[]>([])
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [service, setService] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [notes, setNotes] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [machines, setMachines] = useState<Machine[]>([])
  const [sn, setSn] = useState("")
  const [machineInfo, setMachineInfo] = useState<Partial<Machine>>({})

  useEffect(() => {
    // Logiciels (clé conforme à la config)
    try {
      const raw = localStorage.getItem('custom_softwares')
      let list: string[] = []
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.every(x => typeof x === 'string')) {
            list = parsed
          } else {
            console.error('custom_softwares mal formaté:', parsed)
          }
        } catch (err) {
          console.error('Erreur parsing custom_softwares:', err)
        }
      }
      setSoftwares(list)
      const init: Record<string, boolean> = {}
      list.forEach((s: string) => { init[s] = false })
      setSelected(init)
    } catch (e) {
      setSoftwares([])
      console.error('localStorage inaccessible ou erreur inattendue:', e)
    }
    // Utilisateurs
    fetch('/api/users').then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
      }
    })
  }, [])

  useEffect(() => {
    if (!selectedUserId) {
      setCompanyName("")
      return
    }
    const user = users.find(u => u.id === selectedUserId)
    setCompanyName(user?.company?.name || "")
  }, [selectedUserId, users])

  // Charger les machines pour SN
  useEffect(() => {
    fetch('/api/machines').then(async (res) => {
      if (res.ok) {
        const data = await res.json()
        setMachines(data.machines || [])
      }
    })
  }, [])

  // Auto-remplir machine par SN
  useEffect(() => {
    if (!sn) {
      setMachineInfo({})
      return
    }
    const found = machines.find(m => m.serialNumber && m.serialNumber.toLowerCase() === sn.toLowerCase())
    if (found) setMachineInfo(found)
    else setMachineInfo({})
  }, [sn, machines])

  const toggle = (name: string) => {
    setSelected(prev => ({ ...prev, [name]: !prev[name] }))
  }

  // Génération PDF via l'API serveur pour utiliser le logo lié à l'utilisateur
  const handleGeneratePDF = async () => {
    try {
      if (!selectedUserId) {
        alert('Veuillez sélectionner un utilisateur avant de générer le PDF.')
        return
      }
      const checkedSofts = Object.keys(selected).filter(k => selected[k])
      const payload = {
        userId: selectedUserId,
        service,
        date,
        notes,
        sn,
        machineInfo,
        softwares: checkedSofts,
      }

      const res = await fetch('/api/interventions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        console.error('Erreur génération PDF intervention:', data)
        alert(data.error || 'Erreur génération PDF')
        return
      }

      if (data && data.pdfUrl) {
        window.open(data.pdfUrl, '_blank')
      } else {
        alert('PDF généré, mais aucun URL retourné')
      }
    } catch (err) {
      console.error(err)
      alert('Erreur serveur lors de la génération du PDF')
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Fiche d'intervention</h2>
        <div className="flex gap-2">
          <Button onClick={() => window.print()} variant="outline">Imprimer</Button>
          <Button onClick={handleGeneratePDF} variant="default" disabled={!selectedUserId}>Générer PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-muted-foreground">Utilisateur</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner un utilisateur" />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Société</label>
          <Input value={companyName} readOnly />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Service</label>
          <Input value={service} onChange={(e) => setService(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-muted-foreground mb-2">Travaux effectués / Notes</label>
        <textarea className="w-full border rounded p-2" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="mb-4">
        <h3 className="font-medium mb-2">Liste des logiciels</h3>
          <div>
            <label className="block text-sm text-muted-foreground">N° de série (SN)</label>
            <Input value={sn} onChange={e => setSn(e.target.value)} placeholder="Entrer le SN..." />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">Code inventaire</label>
            <Input value={machineInfo.inventoryCode || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">Marque</label>
            <Input value={machineInfo.vendor || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">Modèle</label>
            <Input value={machineInfo.model || ""} readOnly />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground">Type</label>
            <Input value={machineInfo.type || ""} readOnly />
          </div>
        <div className="grid grid-cols-2 gap-2">
          {softwares.length === 0 ? (
            <div className="text-sm text-muted-foreground">Aucun logiciel configuré. Configurez-les dans Paramètres &gt; Logiciels.</div>
          ) : (
            softwares.map(s => (
              <label key={s} className="flex items-center gap-2">
                <input type="checkbox" checked={!!selected[s]} onChange={() => toggle(s)} />
                <span className="text-sm">{s}</span>
              </label>
            ))
          )}
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={() => {
          const checked = Object.keys(selected).filter(k => selected[k])
          const payload = { companyName, service, date, notes, softwares: checked }
          console.log('Fiche:', payload)
          window.print()
        }}>Générer / Imprimer</Button>
      </div>
    </div>
  )
}
