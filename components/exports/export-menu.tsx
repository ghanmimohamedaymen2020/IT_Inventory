"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, FileJson } from "lucide-react"
import { toast } from "sonner"

interface ExportMenuProps {
  data: any[]
  filename: string
  type: "machines" | "users" | "delivery-notes" | "installation-sheets"
}

export function ExportMenu({ data, filename, type }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState(false)

  const exportToCSV = () => {
    if (data.length === 0) {
      toast.error("Aucune donnée à exporter")
      return
    }

    setIsExporting(true)
    try {
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(","),
        ...data.map(row =>
          headers.map(header => {
            const value = row[header]
            return typeof value === "string" && value.includes(",")
              ? `"${value}"`
              : value
          }).join(",")
        )
      ].join("\n")

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${filename}.csv`
      link.click()

      toast.success("Export CSV réussi")
    } catch (error) {
      toast.error("Erreur lors de l'export CSV")
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/export/excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, filename, type })
      })

      if (!response.ok) throw new Error("Erreur export Excel")

      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${filename}.xlsx`
      link.click()

      toast.success("Export Excel réussi")
    } catch (error) {
      toast.error("Erreur lors de l'export Excel")
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToPDF = () => {
    if (data.length === 0) {
      toast.error("Aucune donnée à exporter")
      return
    }

    setIsExporting(true)
    try {
      // Filtrer et nettoyer les données pour l'affichage
      const cleanData = data.map(item => {
        const cleaned: Record<string, any> = {}
        Object.keys(item).forEach(key => {
          // Ignorer les champs complexes ou inutiles
          if (key !== 'id' && key !== 'googleAuthId' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'company' && key !== 'user') {
            const value = item[key]
            if (value !== null && value !== undefined) {
              // Formater les dates
              if (value instanceof Date) {
                cleaned[key] = value.toLocaleDateString('fr-FR')
              } else if (typeof value === 'object') {
                cleaned[key] = JSON.stringify(value)
              } else {
                cleaned[key] = value
              }
            } else {
              cleaned[key] = '-'
            }
          }
        })
        return cleaned
      })

      if (cleanData.length === 0 || Object.keys(cleanData[0]).length === 0) {
        toast.error("Aucune donnée à afficher")
        return
      }

      const headers = Object.keys(cleanData[0])
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${filename}</title>
  <style>
    @page { 
      size: A4 landscape; 
      margin: 15mm;
    }
    @media print {
      body { margin: 0; }
      .no-print { display: none; }
    }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif;
      margin: 20px;
      font-size: 11pt;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #4CAF50;
    }
    h1 { 
      color: #333;
      margin: 0;
      font-size: 18pt;
    }
    .meta {
      color: #666;
      font-size: 9pt;
      margin-top: 5px;
    }
    table { 
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 9pt;
    }
    th, td { 
      border: 1px solid #ddd;
      padding: 8px 6px;
      text-align: left;
      word-wrap: break-word;
    }
    th { 
      background-color: #4CAF50;
      color: white;
      font-weight: bold;
      position: sticky;
      top: 0;
    }
    tr:nth-child(even) { 
      background-color: #f9f9f9;
    }
    tr:hover {
      background-color: #f1f1f1;
    }
    .footer { 
      margin-top: 20px;
      text-align: center;
      color: #666;
      font-size: 8pt;
      padding-top: 10px;
      border-top: 1px solid #ddd;
    }
    .print-btn {
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 20px;
      background-color: #4CAF50;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .print-btn:hover {
      background-color: #45a049;
    }
  </style>
</head>
<body>
  <button class="print-btn no-print" onclick="window.print()">🖨️ Imprimer / Sauvegarder en PDF</button>
  
  <div class="header">
    <h1>${filename}</h1>
    <div class="meta">
      Généré le ${new Date().toLocaleDateString('fr-FR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })} | Total: ${cleanData.length} enregistrement(s)
    </div>
  </div>
  
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${h.replace(/([A-Z])/g, ' $1').trim()}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${cleanData.map(row => `
        <tr>${headers.map(h => `<td>${String(row[h] || '-').substring(0, 100)}</td>`).join('')}</tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    © IT Inventory Management System - Document généré automatiquement
  </div>
</body>
</html>
      `

      // Créer un blob et ouvrir dans un nouvel onglet
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const newWindow = window.open(url, '_blank')
      
      if (!newWindow) {
        toast.error("Veuillez autoriser les pop-ups pour exporter en PDF")
      } else {
        toast.success("Document ouvert - Cliquez sur Imprimer pour sauvegarder en PDF")
      }
    } catch (error) {
      toast.error("Erreur lors de la génération du PDF")
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToJSON = () => {
    if (data.length === 0) {
      toast.error("Aucune donnée à exporter")
      return
    }

    setIsExporting(true)
    try {
      const jsonContent = JSON.stringify(data, null, 2)
      const blob = new Blob([jsonContent], { type: "application/json" })
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = `${filename}.json`
      link.click()

      toast.success("Export JSON réussi")
    } catch (error) {
      toast.error("Erreur lors de l'export JSON")
      console.error(error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Export..." : "Exporter"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Format d'export</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportToCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPDF}>
          <FileText className="mr-2 h-4 w-4" />
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToJSON}>
          <FileJson className="mr-2 h-4 w-4" />
          JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
