"use client"
import React, { useEffect, useState } from 'react'

type AE = { id: string; email: string; isActive: boolean; note?: string; createdAt: string }

export default function AuthorizedEmailsClient() {
  const [list, setList] = useState<AE[]>([])
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/authorized-emails')
      if (!res.ok) throw new Error('Erreur chargement')
      const j = await res.json()
      setList(j.authorizedEmails || [])
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function addEmail(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/authorized-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, note })
      })
      if (!res.ok) throw new Error('Erreur création')
      await load()
      setEmail('')
      setNote('')
    } catch (err: any) {
      setError(err.message || 'Erreur')
    } finally { setLoading(false) }
  }

  async function remove(id: string) {
    if (!confirm('Supprimer cet email autorisé ?')) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/authorized-emails?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erreur suppression')
      await load()
    } catch (err: any) { setError(err.message || 'Erreur') } finally { setLoading(false) }
  }

  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="text-lg font-semibold mb-3">Emails autorisés</h3>
      <form onSubmit={addEmail} className="flex gap-2 mb-3">
        <input className="border p-2 rounded flex-1" placeholder="email@exemple.com" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="border p-2 rounded w-48" placeholder="note (optionnel)" value={note} onChange={e => setNote(e.target.value)} />
        <button className="bg-blue-600 text-white px-3 py-2 rounded" disabled={loading || !email}>Ajouter</button>
      </form>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {loading && <div className="text-sm text-gray-500 mb-2">Chargement...</div>}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-600">
            <th className="py-1">Email</th>
            <th className="py-1">Actif</th>
            <th className="py-1">Note</th>
            <th className="py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map(a => (
            <tr key={a.id} className="border-t">
              <td className="py-2">{a.email}</td>
              <td className="py-2">{a.isActive ? 'Oui' : 'Non'}</td>
              <td className="py-2">{a.note || '-'}</td>
              <td className="py-2"><button className="text-red-600" onClick={() => remove(a.id)}>Supprimer</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
