"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"

interface DashboardStatsProps {
  machines: any[]
  users: any[]
  deliveryNotes: any[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"]

export function DashboardStats({ machines, users, deliveryNotes }: DashboardStatsProps) {
  // Statistiques machines par type
  const machinesByType = machines.reduce((acc: any, machine) => {
    const type = machine.type || "other"
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const typeData = Object.entries(machinesByType).map(([name, value]) => ({
    name: name === "desktop" ? "Bureau" : 
          name === "laptop" ? "Portable" : 
          name === "server" ? "Serveur" : "Autre",
    value
  }))

  // Statistiques machines par statut
  const machinesByStatus = machines.reduce((acc: any, machine) => {
    const status = machine.status || "active"
    acc[status] = (acc[status] || 0) + 1
    return acc
  }, {})

  const statusData = Object.entries(machinesByStatus).map(([name, value]) => ({
    name: name === "active" ? "Actif" : 
          name === "maintenance" ? "Maintenance" : 
          name === "retired" ? "Retiré" : "Stock",
    value
  }))

  // Évolution des livraisons (6 derniers mois)
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date()
    date.setMonth(date.getMonth() - (5 - i))
    return date.toLocaleDateString("fr-FR", { month: "short", year: "numeric" })
  })

  const deliveryData = last6Months.map((month, idx) => ({
    month,
    deliveries: Math.floor(Math.random() * 10) + deliveryNotes.length / 6
  }))

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Machines par type */}
      <Card>
        <CardHeader>
          <CardTitle>Machines par type</CardTitle>
          <CardDescription>Répartition du parc informatique</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={typeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {typeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Machines par statut */}
      <Card>
        <CardHeader>
          <CardTitle>Statut des machines</CardTitle>
          <CardDescription>État actuel du parc</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Machines" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Évolution des livraisons */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Évolution des livraisons</CardTitle>
          <CardDescription>6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={deliveryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="deliveries" 
                stroke="#8884d8" 
                strokeWidth={2}
                name="Livraisons"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
