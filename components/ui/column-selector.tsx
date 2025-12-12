"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import React from "react"

interface ColumnSelectorProps {
  allColumns: string[]
  columnLabels?: Record<string,string>
  selectedColumns: string[]
  onChange: (cols: string[]) => void
  triggerLabel?: string
}

export default function ColumnSelector({ allColumns, columnLabels = {}, selectedColumns, onChange, triggerLabel = 'Colonnes' }: ColumnSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">{triggerLabel}</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent sideOffset={6}>
        <DropdownMenuLabel>Afficher les colonnes</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allColumns.map(col => (
          <DropdownMenuCheckboxItem key={col} checked={selectedColumns.includes(col)} onCheckedChange={(checked) => {
            if (checked) onChange(Array.from(new Set([...selectedColumns, col])))
            else onChange(selectedColumns.filter(c => c !== col))
          }}>
            {columnLabels[col] ?? col}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
