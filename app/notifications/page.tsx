"use client"

import { useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type NotificationType = 'low_stock' | 'maintenance' | 'info' | 'warning'

interface NotificationItem {
  id: string
  message: string
  type: NotificationType
  quantity?: number
  minimumStock?: number
  deviceName?: string
  timestamp: string
  read: boolean
}

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      try {
        const res = await fetch('/api/notifications')
        if (!res.ok) throw new Error('Failed')
        const data = await res.json()
        // Server returns persisted notifications with read flag; show unread only by default
        if (mounted) setItems(data.filter((d: any) => !d.read))
      } catch (err) {
        console.error(err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold flex items-center gap-3"><Bell className="h-5 w-5" /> Notifications</h1>
        <div>
          <Button onClick={() => location.reload()} variant="outline">Rafraîchir</Button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="p-6 bg-white rounded border text-center">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="p-6 bg-white rounded border text-center text-gray-600">Aucune notification</div>
        ) : (
          items.map(item => (
            <div key={item.id} className="p-4 bg-white rounded border flex items-start gap-4">
              <div className="mt-1">
                <Badge variant={item.type === 'low_stock' ? 'warning' : item.type === 'maintenance' ? 'info' : item.type === 'warning' ? 'destructive' : 'secondary'}>
                  {item.type}
                </Badge>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{item.message}</div>
                  <div className="text-sm text-gray-400">{new Date(item.timestamp).toLocaleString('fr-FR')}</div>
                </div>
                {item.deviceName && <div className="text-sm text-gray-600 mt-1">Équipement: {item.deviceName}</div>}
                {item.quantity !== undefined && item.minimumStock !== undefined && (
                  <div className="text-sm text-gray-600 mt-2">Stock: {item.quantity}/{item.minimumStock}</div>
                )}
              </div>
                <div className="flex-shrink-0">
                <Button size="sm" variant={item.read ? 'ghost' : 'default'} onClick={async () => {
                  try { await fetch(`/api/notifications/${item.id}/read`, { method: 'POST' }) } catch {}
                  // remove from list after marking read
                  setItems(prev => prev.filter(p => p.id !== item.id))
                }}>{item.read ? 'Lu' : 'Marquer lu'}</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
