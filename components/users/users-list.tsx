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

  return (
    <div className="border rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-center p-3">
        <div />
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
          {users.map(user => (
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
