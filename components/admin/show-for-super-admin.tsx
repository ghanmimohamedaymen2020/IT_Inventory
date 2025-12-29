"use client"

import { useEffect, useState, PropsWithChildren } from "react"

export function ShowForSuperAdmin({ children }: PropsWithChildren) {
  const [allowed, setAllowed] = useState<boolean | null>(null)

  useEffect(() => {
    let mounted = true
    fetch('/api/debug/session')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!mounted) return
        setAllowed(!!data?.user && data.user.role === 'super_admin')
      })
      .catch(() => {
        if (!mounted) return
        setAllowed(false)
      })

    return () => { mounted = false }
  }, [])

  if (allowed === null) return null
  if (!allowed) return null
  return <>{children}</>
}
