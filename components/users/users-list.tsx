"use client"

import { useLayoutEffect, useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import ColumnSelector from "@/components/ui/column-selector"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { useMemo } from "react"
import { Edit } from "lucide-react"

type User = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone?: string | null
  department?: string | null
  role: string
  company: {
    id: string
    name: string
    code: string
  }
}

interface UsersListProps {
  users: User[]
  initialColumns?: string[]
}

export default function UsersList({ users, initialColumns }: UsersListProps) {
  const allColumns = ['name','email','phone','company','department','role','actions']
  const columnLabels: Record<string,string> = {
    name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    company: 'Société',
    department: 'Département',
    role: 'Rôle',
    actions: 'Actions'
  }

  const [selectedColumns, setSelectedColumns] = useState<string[]>(initialColumns && initialColumns.length > 0 ? initialColumns : allColumns)

  useLayoutEffect(() => {
    if (!initialColumns) {
      try {
        const raw = localStorage.getItem('users_table_columns')
        if (raw) {
          const parsed = JSON.parse(raw)
          if (Array.isArray(parsed) && parsed.length > 0) setSelectedColumns(parsed)
        }
      } catch (e) {}
    }
  }, [initialColumns])

  useEffect(() => {
    try { localStorage.setItem('users_table_columns', JSON.stringify(selectedColumns)) } catch (e) {}
    try { const cookieValue = encodeURIComponent(JSON.stringify(selectedColumns)); document.cookie = `users_table_columns=${cookieValue}; path=/; max-age=${60*60*24*365}` } catch (e) {}
  }, [selectedColumns])

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin': return <Badge variant="destructive">Super Admin</Badge>
      case 'company_admin': return <Badge>Admin</Badge>
      case 'viewer': return <Badge variant="secondary">Viewer</Badge>
      default: return <Badge variant="outline">{role}</Badge>
    }
  }
  // derive companies and roles for filters
  const companies = useMemo(() => {
    const map = new Map<string, { id: string; name: string; code: string }>()
    users.forEach(u => {
      if (u.company && !map.has(u.company.id)) map.set(u.company.id, u.company)
    })
    return Array.from(map.values())
  }, [users])

  const roles = useMemo(() => {
    const s = new Set<string>()
    users.forEach(u => s.add(u.role))
    return Array.from(s)
  }, [users])

  const [selectedCompany, setSelectedCompany] = useState<string | null>("all")
  const [selectedRole, setSelectedRole] = useState<string | null>("all")

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const companyMatch = selectedCompany === "all" || !selectedCompany || u.company?.id === selectedCompany
      const roleMatch = selectedRole === "all" || !selectedRole || u.role === selectedRole
      return companyMatch && roleMatch
    })
  }, [users, selectedCompany, selectedRole])

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between p-3 gap-4">
        <div className="flex items-center gap-3">
          <Select value={selectedCompany ?? "all"} onValueChange={(v) => setSelectedCompany(v)}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Toutes les sociétés" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sociétés</SelectItem>
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRole ?? "all"} onValueChange={(v) => setSelectedRole(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {roles.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
            </SelectContent>
          </Select>
          <div className="text-sm text-muted-foreground">{filteredUsers.length} résultat{filteredUsers.length > 1 ? 's' : ''}</div>
        </div>

        <div>
          <ColumnSelector allColumns={allColumns} columnLabels={columnLabels} selectedColumns={selectedColumns} onChange={setSelectedColumns} />
        </div>
      </div>

      <Table className="min-w-full">
        <TableHeader>
          <TableRow className="bg-gray-50">
            {selectedColumns.includes('name') && <TableHead className="text-base text-gray-800 py-4">Nom</TableHead>}
            {selectedColumns.includes('email') && <TableHead className="text-base text-gray-800 py-4">Email</TableHead>}
            {selectedColumns.includes('phone') && <TableHead className="text-base text-gray-800 py-4">Téléphone</TableHead>}
            {selectedColumns.includes('company') && <TableHead className="text-base text-gray-800 py-4">Société</TableHead>}
            {selectedColumns.includes('department') && <TableHead className="text-base text-gray-800 py-4">Département</TableHead>}
            {selectedColumns.includes('role') && <TableHead className="text-base text-gray-800 py-4">Rôle</TableHead>}
            {selectedColumns.includes('actions') && <TableHead className="text-right text-base text-gray-800 py-4">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map(user => (
            <TableRow key={user.id} className="hover:bg-gray-50 transition">
              {selectedColumns.includes('name') && <TableCell className="text-gray-900 py-3">{user.firstName} {user.lastName}</TableCell>}
              {selectedColumns.includes('email') && <TableCell className="text-base text-gray-600 py-3">{user.email}</TableCell>}
              {selectedColumns.includes('phone') && <TableCell className="text-base text-gray-600 py-3">{user.phone || '-'}</TableCell>}
              {selectedColumns.includes('company') && <TableCell className="py-3"><div className="flex items-center gap-2"><span className="text-base text-gray-700 font-medium">{user.company.name}</span><Badge variant="outline" className="text-xs font-semibold">{user.company.code}</Badge></div></TableCell>}
              {selectedColumns.includes('department') && <TableCell className="text-base text-gray-600 py-3">{user.department || '-'}</TableCell>}
              {selectedColumns.includes('role') && <TableCell className="py-3">{getRoleBadge(user.role)}</TableCell>}
              {selectedColumns.includes('actions') && <TableCell className="text-right py-3"><Link href={`/dashboard/users/${user.id}`}><Button variant="outline" size="sm"><Edit className="mr-2 h-4 w-4"/>Modifier</Button></Link></TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
