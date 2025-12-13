"use client"

import { useEffect, useState } from "react"

export function SettingsFormFixed() {
  const [companiesCount, setCompaniesCount] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/companies')
      .then((r) => r.ok ? r.json() : [])
      .then((data) => { if (mounted) setCompaniesCount(Array.isArray(data) ? data.length : 0) })
      .catch(() => { if (mounted) setCompaniesCount(0) })
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold">Paramètres (version fixe)</h2>
      <div className="mt-3">Sociétés: {companiesCount === null ? '…' : companiesCount}</div>
      <p className="mt-4 text-sm text-muted-foreground">Composant temporaire pour déverrouiller la compilation.</p>
    </div>
  )
}
