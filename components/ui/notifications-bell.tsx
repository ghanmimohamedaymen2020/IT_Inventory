"use client"

import { useEffect, useState, useRef } from 'react'
import { Bell, Check, Loader2, AlertTriangle, Info } from 'lucide-react'
import Link from 'next/link'
import { cn } from "@/lib/utils"
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

export default function NotificationsBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState<number>(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) throw new Error('Failed to fetch')
      const data: NotificationItem[] = await res.json()
      // server returns persisted notifications with `read` flag
      const unread = data.filter(d => !d.read)
      setItems(unread)
      setUnread(unread.length)
    } catch (err) {
      console.error('Failed to fetch notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const id = setInterval(fetchNotifications, 60000)
    return () => clearInterval(id)
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    } catch (err) {
      // best-effort
    }
    // persist read id locally so it won't reappear after refresh
    // remove from UI
    setItems(prev => prev.filter(item => item.id !== id))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' })
    } catch (err) {
      // ignore
    }
    // persist all current ids as read locally
    try {
      const raw = localStorage.getItem('readNotifications')
      const readIds = raw ? JSON.parse(raw) as string[] : []
      const allIds = Array.from(new Set([...readIds, ...items.map(i => i.id)]))
      localStorage.setItem('readNotifications', JSON.stringify(allIds))
    } catch {}
    setItems([])
    setUnread(0)
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'low_stock': return <AlertTriangle className="h-4 w-4 text-amber-500" />
      case 'maintenance': return <AlertTriangle className="h-4 w-4 text-blue-500" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-red-500" />
      default: return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationBadge = (type: NotificationType) => {
    switch (type) {
      case 'low_stock': return <Badge variant="warning" className="text-xs">Stock bas</Badge>
      case 'maintenance': return <Badge variant="info" className="text-xs">Maintenance</Badge>
      case 'warning': return <Badge variant="destructive" className="text-xs">Critique</Badge>
      default: return null
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
        aria-label={`Notifications ${unread > 0 ? `(${unread} non lus)` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs font-medium text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg border shadow-lg z-50 animate-in fade-in-0 zoom-in-95">
          <div className="p-4 border-b flex items-center justify-between bg-gray-50 rounded-t-lg">
            <div className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
              {unread > 0 && (
                <Badge variant="secondary" className="ml-2">{unread} non lus</Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-8 text-xs">
                  <Check className="h-3 w-3 mr-1" />
                  Tout marquer comme lu
                </Button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="font-medium">Aucune notification</p>
                <p className="text-sm mt-1">Vous serez averti des nouvelles activités</p>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className={cn("p-4 border-b hover:bg-gray-50 transition-colors", !item.read && "bg-blue-50")}>
                  <div className="flex gap-3">
                    <div className="mt-0.5">{getNotificationIcon(item.type)}</div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm font-medium">{item.message}</p>
                        {getNotificationBadge(item.type)}
                      </div>

                      {item.deviceName && (
                        <p className="text-sm text-gray-600 mt-1">Équipement: <span className="font-medium">{item.deviceName}</span></p>
                      )}

                      {item.quantity !== undefined && item.minimumStock !== undefined && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                            <span>Stock: {item.quantity}/{item.minimumStock}</span>
                            <span className="font-medium text-amber-600">{((item.quantity / item.minimumStock) * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className={cn("h-1.5 rounded-full",
                              item.quantity <= item.minimumStock * 0.2 ? "bg-red-500" : item.quantity <= item.minimumStock * 0.5 ? "bg-amber-500" : "bg-green-500"
                            )} style={{ width: `${Math.min(100, (item.quantity / item.minimumStock) * 100)}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{new Date(item.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {!item.read && (
                          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => markAsRead(item.id)}>
                            <Check className="h-3 w-3 mr-1" />
                            Marquer comme lu
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t bg-gray-50 rounded-b-lg">
            <div className="flex items-center justify-between">
              <Link href="/notifications" className="text-sm font-medium text-primary hover:text-primary/80" onClick={() => setOpen(false)}>
                Voir toutes les notifications
              </Link>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="h-8">Fermer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
