"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function MachinesImport() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('preview', preview ? 'true' : 'false')

      const res = await fetch('/api/machines/import', { method: 'POST', body: fd })
      const data = await res.json()
      setResult({ status: res.status, body: data })
    } catch (err) {
      setResult({ error: String(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          type="file"
          accept=".csv,.xlsx,.xls,.txt"
          onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
        />
        <label className="text-sm">
          <input type="checkbox" checked={preview} onChange={(e) => setPreview(e.target.checked)} /> Prévisualiser
        </label>
        <Button type="submit" disabled={loading || !file}>{loading ? '...' : 'Importer'}</Button>
      </form>

      {result && (
        <div className="ml-4 text-sm">
          {result.error && <div className="text-destructive">Erreur: {String(result.error)}</div>}
          {result.status && (
            <div>
              <div>Statut: {result.status}</div>
              <pre className="max-h-48 overflow-auto text-xs bg-muted p-2 rounded">{JSON.stringify(result.body, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
