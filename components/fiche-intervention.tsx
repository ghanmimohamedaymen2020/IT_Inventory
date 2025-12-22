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
  const [selectedSoft, setSelectedSoft] = useState<Record<string, boolean>>({})
  const [softFilter, setSoftFilter] = useState<string>("")
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const toLocalDatetime = (d = new Date()) => {
    const dt = new Date(d)
    dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset())
    return dt.toISOString().slice(0,16) // YYYY-MM-DDTHH:MM
  }

  const [dateDebut, setDateDebut] = useState<string>(toLocalDatetime())
  const [dateFin, setDateFin] = useState<string>(toLocalDatetime())
  const [dateRangeValid, setDateRangeValid] = useState<boolean>(true)
  const [durationStr, setDurationStr] = useState<string>('')
  const [notes, setNotes] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [machines, setMachines] = useState<Machine[]>([])
  const [sn, setSn] = useState("")
  const [machineInfo, setMachineInfo] = useState<Partial<Machine>>({})
  const [snExists, setSnExists] = useState<boolean | null>(null)
  const [snTypeValid, setSnTypeValid] = useState<boolean | null>(null)
  const [snError, setSnError] = useState<string>("")

  useEffect(() => {
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

  // Auto-remplir machine par SN et valider le type
  useEffect(() => {
    if (!sn) {
      setMachineInfo({})
      setSnExists(null)
      setSnTypeValid(null)
      setSnError("")
      return
    }
    const found = machines.find(m => m.serialNumber && m.serialNumber.toLowerCase() === sn.toLowerCase())
    if (found) {
      setMachineInfo(found)
      setSnExists(true)
      const t = (found.type || '').toLowerCase()
      const allowed = ['laptop','portable','notebook','notebook pc','desktop','pc','server','serveur','tablet','tablet pc','smartphone','phone','mobile']
      const disallowedKeywords = ['screen','monitor','écran','ecran']
      if (disallowedKeywords.some(k => t.includes(k))) {
        setSnTypeValid(false)
        setSnError('Type non supporté : écran / moniteur (utiliser une machine)')
      } else if (allowed.some(a => t.includes(a))) {
        setSnTypeValid(true)
        setSnError("")
      } else {
        setSnTypeValid(false)
        setSnError(`Type inconnu (« ${found.type || '—'} »). Autorisé: laptop/desktop/server/tablet/smartphone`)
      }
    } else {
      setMachineInfo({})
      setSnExists(false)
      setSnTypeValid(false)
      setSnError('SN introuvable')
    }
  }, [sn, machines])

  // Calculate duration and validate date range whenever dates change
  useEffect(() => {
    // compute working duration based on schedule 08:30-13:00 and 14:00-17:30
    if (!dateDebut || !dateFin) {
      setDurationStr('')
      setDateRangeValid(true)
      return
    }
    try {
      const s = new Date(dateDebut)
      const e = new Date(dateFin)
      if (isNaN(s.getTime()) || isNaN(e.getTime())) {
        setDurationStr('Date invalide')
        setDateRangeValid(false)
        return
      }
      if (e.getTime() < s.getTime()) {
        setDurationStr('Plage non valide')
        setDateRangeValid(false)
        return
      }

      const overlapMinutes = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
        const startMs = Math.max(aStart.getTime(), bStart.getTime())
        const endMs = Math.min(aEnd.getTime(), bEnd.getTime())
        return Math.max(0, Math.floor((endMs - startMs) / 60000))
      }

      const getWorkWindowsForDay = (day: Date): [Date, Date][] => {
        const y = day.getFullYear()
        const m = day.getMonth()
        const d = day.getDate()
        const dow = day.getDay()
        switch (dow) {
          case 0:
            return []
          case 6:
            return [[new Date(y, m, d, 9, 0), new Date(y, m, d, 12, 30)]]
          case 5:
            return [
              [new Date(y, m, d, 8, 0), new Date(y, m, d, 12, 30)],
              [new Date(y, m, d, 14, 0), new Date(y, m, d, 17, 0)]
            ]
          default:
            return [
              [new Date(y, m, d, 8, 30), new Date(y, m, d, 13, 0)],
              [new Date(y, m, d, 14, 0), new Date(y, m, d, 17, 30)]
            ]
        }
      }

      let totalMinutes = 0
      const cur = new Date(s.getFullYear(), s.getMonth(), s.getDate())
      const endDay = new Date(e.getFullYear(), e.getMonth(), e.getDate())

      while (cur.getTime() <= endDay.getTime()) {
        const windows = getWorkWindowsForDay(cur)
        for (const [wStart, wEnd] of windows) {
          totalMinutes += overlapMinutes(s, e, wStart, wEnd)
        }
        cur.setDate(cur.getDate() + 1)
      }

      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      setDurationStr(hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`)
      setDateRangeValid(true)
    } catch (err) {
      setDurationStr('Erreur')
      setDateRangeValid(false)
    }
  }, [dateDebut, dateFin])

  // Charger logiciels depuis localStorage (clé: custom_softwares)
  useEffect(() => {
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
      setSelectedSoft(init)
    } catch (e) {
      setSoftwares([])
      setSelectedSoft({})
      console.error('localStorage inaccessible ou erreur inattendue:', e)
    }
  }, [])

  const toggleSoftware = (name: string) => {
    setSelectedSoft(prev => ({ ...prev, [name]: !prev[name] }))
  }

  // Génération PDF via l'API serveur pour utiliser le logo lié à l'utilisateur
  const handleGeneratePDF = async () => {
      if (!selectedUserId) {
        alert('Veuillez sélectionner un utilisateur avant de générer le PDF.')
        return
      }
      const checkedSofts = Object.keys(selectedSoft).filter(k => selectedSoft[k])
      const payload = {
        userId: selectedUserId,
        dateDebut,
        dateFin,
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
    }

  return (
    <div className="p-4 bg-white border rounded-md shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-medium">Fiche d'intervention</h2>
          <p className="text-xs text-muted-foreground">Compact · Génération de fichier</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleGeneratePDF} variant="default" className="h-8 px-3 text-sm" disabled={!(selectedUserId && snExists && snTypeValid)}>Générer PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs text-muted-foreground">Utilisateur</label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-full h-8">
              <SelectValue placeholder="Sélectionner" />
            </SelectTrigger>
            <SelectContent>
              {users.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground">Date début</label>
          <Input type="datetime-local" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className="h-8" />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground">Date fin</label>
          <Input type="datetime-local" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className="h-8" />
        </div>

        <div>
          <label className="block text-xs text-muted-foreground">N° de série (SN)</label>
          <Input value={sn} onChange={e => setSn(e.target.value)} placeholder="SN..." className="h-8" />
          {snError && <p className="text-xs text-red-600 mt-1">{snError}</p>}
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Durée: <span className={`font-medium ${!dateRangeValid ? 'text-red-600' : ''}`}>{durationStr || '—'}</span></p>
          {!dateRangeValid && <p className="text-xs text-red-600">Vérifiez que la date de début est antérieure à la date de fin.</p>}
        </div>
      </div>

      {/* Les champs auto-remplis (société / code inventaire / modèle) sont masqués — conservés côté serveur si nécessaire */}

      <div className="mb-3">
        <label className="block text-xs text-muted-foreground mb-1">Travaux effectués / Notes</label>
        <textarea className="w-full border rounded p-2 text-sm h-28 resize-y" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="mb-3">
        <h3 className="text-sm font-medium mb-2">Logiciels</h3>
        {softwares.length === 0 ? (
          <div className="text-xs text-muted-foreground">Aucun logiciel configuré. Configurez-les dans Paramètres → Logiciels.</div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-2">
              <Input placeholder="Filtrer les logiciels..." value={softFilter} onChange={e => setSoftFilter(e.target.value)} className="h-8" />
              <div className="text-xs text-muted-foreground">{softwares.length} total</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {softwares
                .filter(s => s.toLowerCase().includes(softFilter.trim().toLowerCase()))
                .map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSoftware(s)}
                    className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors ${selectedSoft[s] ? 'bg-primary text-white border-primary' : 'bg-muted/10 text-muted-foreground hover:border-border'}`}>
                    <input type="checkbox" checked={!!selectedSoft[s]} readOnly className="w-4 h-4" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 mt-2">
        <Button onClick={handleGeneratePDF} className="h-8 px-3 text-sm" disabled={!(selectedUserId && snExists && snTypeValid)}>Générer</Button>
      </div>
    </div>
  )
}
