"use client"

import React from 'react'

export default function Header({ children }: { children?: React.ReactNode }) {
  return (
    <header className="w-full border-b bg-white">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-lg font-bold">IT Inventory Management</div>
        </div>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  )
}
