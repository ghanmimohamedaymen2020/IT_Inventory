"use client"

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

type Consumable = {
  id: string
  name: string
  sku?: string | null
  quantity: number
  minThreshold?: number | null
  companyId: string
}

export default function ConsumableList() {
  const [items, setItems] = useState<Consumable[]>([])
  const [loading, setLoading] = useState(false)
  const [adjustValue, setAdjustValue] = useState<number>(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reason, setReason] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState<string>('')
  const [consumableNames, setConsumableNames] = useState<string[]>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  const [newCompanyId, setNewCompanyId] = useState<string | null>(null)
  const [minThreshold, setMinThreshold] = useState<number | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      // Fetch names from API (distinct names from DB)
      try {
        const namesRes = await fetch('/api/consumable-names')
        if (namesRes.ok) {
          const namesData = await namesRes.json()
          if (Array.isArray(namesData)) setConsumableNames(namesData)
        } else {
          // fallback to localStorage/defaults
          const saved = localStorage.getItem('custom_consumable_names')
          if (saved) setConsumableNames(JSON.parse(saved))
        }
      } catch (err) {
        const saved = localStorage.getItem('custom_consumable_names')
        if (saved) setConsumableNames(JSON.parse(saved))
      }

      // Load consumables for each company (requires permission for other companies)
      const all: Consumable[] = []
      for (const c of companies) {
        try {
          const res = await fetch(`/api/consumables?companyId=${c.id}`)
          if (!res.ok) continue
          const data = await res.json()
          if (Array.isArray(data)) {
            // the API returns consumables with companyId included
            all.push(...data)
          }
        } catch (err) {
          // ignore per-company errors
        }
      }
      setItems(all)
    } catch (err) {
      console.error(err)
      toast.error('Impossible de charger les consommables')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    // Load companies first then consumables
    ;(async () => {
      try {
        const res = await fetch('/api/companies')
        if (res.ok) {
          const data = await res.json()
          const list = Array.isArray(data) ? data : data || []
          setCompanies(list)
          if (list.length > 0) setNewCompanyId(list[0].id)
        }
      } catch (err) {
        // ignore
      }
      // After companies loaded, load consumables and names
      await load()
    })()
  }, [])

  const openAdjust = (id: string) => {
    setSelectedId(id)
    setAdjustValue(0)
    setReason('')
  }

  const doAdjust = async () => {
    if (!selectedId) return
    const change = Number(adjustValue)
    if (!Number.isInteger(change) || change === 0) {
      toast.error('Entrez un entier non nul')
      return
    }
    try {
      const res = await fetch(`/api/consumables/${selectedId}/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change, reason })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || 'Erreur')
      }
      toast.success('Ajustement enregistré')
      setSelectedId(null)
      await load()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erreur lors de l\'ajustement')
    }
  }

  const createConsumable = async () => {
    if (!newName.trim()) {
      toast.error('Le nom est requis')
      return
    }

    setCreating(true)
    try {
      const payload: any = { name: newName.trim() }
      if (minThreshold !== null) payload.minThreshold = minThreshold
      if (newCompanyId) payload.companyId = newCompanyId

      const res = await fetch('/api/consumables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err?.error || 'Erreur création')
      }
      toast.success('Consommable créé')
      setNewName('')
      setMinThreshold(null)
      await load()
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || 'Erreur lors de la création')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      <div className="mb-4 p-4 bg-muted rounded">
        <h3 className="font-semibold mb-2">Ajouter un consommable</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div>
            <label className="block text-sm">Nom</label>
            {consumableNames.length > 0 ? (
              <select className="w-full h-9 rounded border px-2" value={newName} onChange={(e) => setNewName(e.target.value)}>
                <option value="">Sélectionner un nom...</option>
                {consumableNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            ) : (
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
            )}
          </div>
          <div>
            <label className="block text-sm">Seuil min</label>
            <Input type="number" value={minThreshold ?? ''} onChange={(e) => setMinThreshold(e.target.value === '' ? null : Number(e.target.value))} />
          </div>
          <div>
            <label className="block text-sm">Société</label>
            {companies.length > 0 ? (
              <select className="w-full h-9 rounded border px-2" value={newCompanyId ?? ''} onChange={(e) => setNewCompanyId(e.target.value || null)}>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            ) : (
              <p className="text-sm text-muted-foreground">Société (sélection disponible pour Super Admin)</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={createConsumable} disabled={creating}>{creating ? 'Création...' : 'Créer'}</Button>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Consommables — Vue par société</h2>
        <div>{loading ? 'Chargement...' : `${companies.length} société(s)`}</div>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-full table-fixed">
          <thead className="bg-muted">
            <tr>
              <th className="p-2 text-left w-48">Société</th>
              {consumableNames.map((cn) => (
                <th key={cn} className="p-2 text-left">{cn}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id} className="border-t">
                <td className="p-2 align-top">{company.name}</td>
                {consumableNames.map((cn) => {
                  const found = items.find(it => it.companyId === company.id && it.name === cn)
                  const qty = found ? found.quantity : 0
                  return (
                    <td key={cn} className="p-2 align-top">
                      <div className="flex items-center gap-2">
                        <div className="min-w-[64px] text-sm">{qty}</div>
                        <div className="flex gap-1">
                          <button className="px-2 py-1 bg-green-500 text-white rounded text-sm" onClick={async () => {
                            try {
                              if (found) {
                                const res = await fetch(`/api/consumables/${found.id}/adjust`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ change: 1, reason: 'Adjustment from matrix +' }) })
                                if (!res.ok) throw new Error('Erreur')
                              } else {
                                const res = await fetch('/api/consumables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: cn, companyId: company.id, quantity: 1 }) })
                                if (!res.ok) throw new Error('Erreur création')
                              }
                              await load()
                            } catch (err) {
                              console.error(err)
                              toast.error('Erreur')
                            }
                          }}>+</button>
                          <button className="px-2 py-1 bg-red-500 text-white rounded text-sm" onClick={async () => {
                            try {
                              if (!found) { toast.error('Aucun consommable à diminuer'); return }
                              const res = await fetch(`/api/consumables/${found.id}/adjust`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ change: -1, reason: 'Adjustment from matrix -' }) })
                              if (!res.ok) throw new Error('Erreur')
                              await load()
                            } catch (err) {
                              console.error(err)
                              toast.error('Erreur')
                            }
                          }}>-</button>
                        </div>
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow">
            <h3 className="font-semibold mb-2">Ajuster consommable</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-sm">Quantité (+ pour entrée, - pour sortie)</label>
                <Input type="number" value={adjustValue} onChange={(e) => setAdjustValue(Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm">Raison (optionnel)</label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setSelectedId(null)}>Annuler</Button>
                <Button onClick={doAdjust}>Enregistrer</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
