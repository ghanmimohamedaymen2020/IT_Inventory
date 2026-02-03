"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import React, { useState } from "react"
import { cn } from "@/lib/utils"

interface ColumnSelectorProps {
  allColumns: string[]
  columnLabels?: Record<string,string>
  selectedColumns: string[]
  onChange: (cols: string[]) => void
  triggerLabel?: string
  className?: string
}

export default function ColumnSelector({ allColumns, columnLabels = {}, selectedColumns, onChange, triggerLabel = 'Colonnes', className }: ColumnSelectorProps) {
  const [open, setOpen] = useState(false)

  const handleSelectAll = () => onChange([...allColumns])
  const handleDeselectAll = () => onChange([])

  return (
    <div className={cn('relative', className)}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            {triggerLabel}
            <span className="ml-2 text-xs text-muted-foreground">{selectedColumns.length}/{allColumns.length}</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto" sideOffset={6}>
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Afficher les colonnes</span>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleSelectAll}>Tout</Button>
              <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleDeselectAll}>Aucun</Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuGroup>
            {allColumns.map((col) => {
              const isSelected = selectedColumns.includes(col)
              return (
                <DropdownMenuCheckboxItem
                  key={col}
                  checked={isSelected}
                  onCheckedChange={(checked) => {
                    if (checked) onChange(Array.from(new Set([...selectedColumns, col])))
                    else onChange(selectedColumns.filter(c => c !== col))
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{columnLabels[col] ?? col}</span>
                    {isSelected && <span className="text-xs text-primary">✓</span>}
                  </div>
                </DropdownMenuCheckboxItem>
              )
            })}
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <div className="p-2 text-xs text-gray-500">
            {selectedColumns.length === 0 ? 'Aucune colonne sélectionnée' : `${selectedColumns.length} colonne(s) sélectionnée(s)`}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Mobile indicator */}
      <div className="md:hidden mt-2">
        {selectedColumns.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedColumns.slice(0,3).map(col => (
              <span key={col} className="px-2 py-1 bg-gray-100 rounded text-xs">{columnLabels[col] ?? col}</span>
            ))}
            {selectedColumns.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">+{selectedColumns.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
