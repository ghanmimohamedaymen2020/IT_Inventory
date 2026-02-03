"use client"

import Link from 'next/link'
import { LayoutDashboard, Package, Tags, Wrench, BarChart3, Users } from 'lucide-react'

export default function Sidebar() {
  const navItems = [
    { label: 'Tableau de bord', icon: LayoutDashboard, href: '/dashboard' },
    { label: 'Inventaire', icon: Package, href: '/dashboard/machines' },
    { label: 'Catégories', icon: Tags, href: '/dashboard/consumables' },
    { label: 'Maintenance', icon: Wrench, href: '/dashboard/interventions' },
    { label: 'Rapports', icon: BarChart3, href: '/dashboard/reports' },
    { label: 'Utilisateurs', icon: Users, href: '/dashboard/users' },
  ]

  return (
    <aside className="w-64 border-r bg-white">
      <div className="p-6">
        <h1 className="text-xl font-bold">IT Inventory</h1>
      </div>
      <nav className="px-2 space-y-1">
        {navItems.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50">
            <item.icon className="h-5 w-5" />
            <span className="text-sm font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  )
}
